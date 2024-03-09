import { getDateString, getDateTimeString } from "@/common/helpers/datetime";
import { TimeLimitSetting } from "@/common/settings/game";
import {
  secondsToMSS,
  detectRecordFormat,
  DoMoveOption,
  exportKIF,
  formatPV,
  ImmutablePosition,
  ImmutableRecord,
  importCSA,
  importKI2,
  importKIF,
  InitialPositionType,
  initialPositionTypeToSFEN,
  Move,
  parseCSAMove,
  parsePV,
  Position,
  PositionChange,
  Record,
  RecordFormatType,
  RecordMetadataKey,
  reverseColor,
  SpecialMove,
  SpecialMoveType,
  importJKFString,
} from "electron-shogi-core";
import { getSituationText } from "./score";
import { CommentBehavior } from "@/common/settings/analysis";
import { t } from "@/common/i18n";
import { localizeError } from "@/common/i18n";
import {
  ExportOptions,
  ExportResult,
  detectRecordFileFormatByPath,
  exportRecordAsBuffer,
  importRecordFromBuffer,
} from "@/common/file/record";
import { SCORE_MATE_INFINITE } from "@/common/game/usi";
import api from "@/renderer/ipc/api";
import { useAppSetting } from "./setting";
import { LogLevel } from "@/common/log";

export enum SearchInfoSenderType {
  PLAYER,
  OPPONENT,
  RESEARCHER,
  RESEARCHER_2,
  RESEARCHER_3,
  RESEARCHER_4,
}

export type SearchInfo = {
  depth?: number; // 探索深さ
  score?: number; // 先手から見た評価値
  mate?: number; // 先手勝ちの場合に正の値、後手勝ちの場合に負の値
  pv?: Move[];
};

export type RecordCustomData = {
  playerSearchInfo?: SearchInfo;
  opponentSearchInfo?: SearchInfo;
  researchInfo?: SearchInfo;
  researchInfo2?: SearchInfo;
  researchInfo3?: SearchInfo;
  researchInfo4?: SearchInfo;
};

export type ImportRecordOption = {
  type?: RecordFormatType;
  markAsSaved?: boolean;
};

function parsePlayerMateScoreComment(line: string): number | undefined {
  const matched = /^\*詰み=(先手勝ち|後手勝ち)(?::([0-9]+)手)?/.exec(line);
  if (matched) {
    return Number(matched[2] || SCORE_MATE_INFINITE) * (matched[1] === "先手勝ち" ? 1 : -1);
  }
}

function parseResearchMateScoreComment(line: string): number | undefined {
  const matched = /^#詰み=(先手勝ち|後手勝ち)(?::([0-9]+)手)?/.exec(line);
  if (matched) {
    return Number(matched[2] || SCORE_MATE_INFINITE) * (matched[1] === "先手勝ち" ? 1 : -1);
  }
}

function parsePlayerScoreComment(line: string): number | undefined {
  const matched = /^\*評価値=([+-]?[.0-9]+)/.exec(line);
  return matched ? Number(matched[1]) : undefined;
}

function parseResearchScoreComment(line: string): number | undefined {
  const matched = /^#評価値=([+-]?[.0-9]+)/.exec(line);
  return matched ? Number(matched[1]) : undefined;
}

function parseFloodgateScoreComment(line: string): number | undefined {
  const matched = /^\* *([+-]?[.0-9]+)/.exec(line);
  return matched ? Number(matched[1]) : undefined;
}

function restoreCustomData(record: Record): void {
  record.forEach((node) => {
    const data = (node.customData || {}) as RecordCustomData;
    const lines = node.comment.split("\n");
    for (const line of lines) {
      const playerMateScore = parsePlayerMateScoreComment(line);
      if (playerMateScore !== undefined) {
        data.playerSearchInfo = {
          ...data.playerSearchInfo,
          mate: playerMateScore,
        };
      }
      const researchMateScore = parseResearchMateScoreComment(line);
      if (researchMateScore !== undefined) {
        data.researchInfo = {
          ...data.researchInfo,
          mate: researchMateScore,
        };
      }
      const playerScore = parsePlayerScoreComment(line) || parseFloodgateScoreComment(line);
      if (playerScore !== undefined) {
        data.playerSearchInfo = {
          ...data.playerSearchInfo,
          score: playerScore,
        };
      }
      const researchScore = parseResearchScoreComment(line);
      if (researchScore !== undefined) {
        data.researchInfo = {
          ...data.researchInfo,
          score: researchScore,
        };
      }
    }
    node.customData = data;
  });
}

function buildSearchComment(
  position: ImmutablePosition,
  type: SearchInfoSenderType,
  searchInfo: SearchInfo,
  options?: {
    engineName?: string;
  },
): string {
  const prefix = type === SearchInfoSenderType.PLAYER ? "*" : "#";
  let comment = "";
  if (searchInfo.mate) {
    const result = searchInfo.mate >= 0 ? "先手勝ち" : "後手勝ち";
    comment += `${prefix}詰み=${result}`;
    if (Math.abs(searchInfo.mate) !== SCORE_MATE_INFINITE) {
      comment += `:${Math.abs(searchInfo.mate)}手`;
    }
    comment += "\n";
  }
  if (searchInfo.score !== undefined) {
    comment += getSituationText(searchInfo.score) + "\n";
    comment += `${prefix}評価値=${searchInfo.score}\n`;
  }
  if (searchInfo.pv && searchInfo.pv.length !== 0) {
    comment += `${prefix}読み筋=${formatPV(position, searchInfo.pv)}\n`;
  }
  if (searchInfo.depth) {
    comment += `${prefix}深さ=${searchInfo.depth}\n`;
  }
  if (comment && options?.engineName) {
    comment += `${prefix}エンジン=${options.engineName}\n`;
  }
  return comment;
}

function parseFloodgatePVComment(position: ImmutablePosition, line: string): Move[] {
  const begin = line.indexOf(" ", line.indexOf(" ") + 1) + 1;
  const pv: Move[] = [];
  const pos = position.clone();
  for (let i = begin; i < line.length; i += 8) {
    const csa = line.substring(i, i + 7);
    const move = parseCSAMove(pos, csa);
    if (move instanceof Error || !pos.doMove(move, { ignoreValidation: false })) {
      break;
    }
    pv.push(move);
  }
  return pv;
}

function getPVsFromSearchComment(position: ImmutablePosition, comment: string): Move[][] {
  return comment
    .split("\n")
    .filter((line) => line.match(/^[#*]読み筋=/) || line.match(/^\* -?[0-9]+ /))
    .map((line) => {
      if (line.startsWith("* ")) {
        return parseFloodgatePVComment(position, line);
      } else {
        return parsePV(position, line.substring(5));
      }
    })
    .filter((pv) => pv.length !== 0);
}

function formatTimeLimitCSA(setting: TimeLimitSetting): string {
  return secondsToMSS(setting.timeSeconds) + "+" + String(setting.byoyomi).padStart(2, "0");
}

type GameStartMetadata = {
  gameTitle?: string;
  blackName?: string;
  whiteName?: string;
  timeLimit?: TimeLimitSetting;
};

type AppendMoveParams = {
  move: Move | SpecialMove | SpecialMoveType;
  moveOption?: DoMoveOption;
  elapsedMs?: number;
};

export type ResetRecordHandler = () => void;
export type ChangePositionHandler = () => void;
export type UpdateCustomDataHandler = () => void;
export type UpdateFollowingMovesHandler = () => void;

export class RecordManager {
  private _record = new Record();
  private _recordFilePath?: string;
  private _unsaved = false;
  private onResetRecord: ResetRecordHandler = () => {
    /* noop */
  };
  private onChangePosition: ChangePositionHandler = () => {
    /* noop */
  };
  private onUpdateCustomData: UpdateCustomDataHandler = () => {
    /* noop */
  };
  private onUpdateFollowingMoves: UpdateFollowingMovesHandler = () => {
    /* noop */
  };

  get record(): ImmutableRecord {
    return this._record;
  }

  get recordFilePath(): string | undefined {
    return this._recordFilePath;
  }

  get unsaved(): boolean {
    return this._unsaved;
  }

  private updateRecordFilePath(recordFilePath: string): void {
    if (recordFilePath === this._recordFilePath) {
      return;
    }
    this._recordFilePath = recordFilePath;
    api.addRecordFileHistory(recordFilePath);
  }

  async saveBackup(): Promise<void> {
    if (!this.unsaved) {
      return;
    }
    const kif = exportKIF(this.record, {
      returnCode: useAppSetting().returnCode,
    });
    await api.saveRecordFileBackup(kif);
  }

  private saveBackupOnBackground(): void {
    this.saveBackup().catch((e) => {
      api.log(LogLevel.ERROR, `failed to save backup: ${e}`);
    });
  }

  reset(): void {
    this.saveBackupOnBackground();
    this._record.clear();
    this._unsaved = false;
    this._recordFilePath = undefined;
    this.onResetRecord();
  }

  resetByInitialPositionType(startPosition: InitialPositionType): void {
    this.resetBySFEN(initialPositionTypeToSFEN(startPosition));
  }

  resetBySFEN(sfen: string): boolean {
    const position = new Position();
    if (!position.resetBySFEN(sfen)) {
      return false;
    }
    this.saveBackupOnBackground();
    this._record.clear(position);
    this._unsaved = false;
    this._recordFilePath = undefined;
    this.onResetRecord();
    return true;
  }

  resetByCurrentPosition(): void {
    this.saveBackupOnBackground();
    this._record.clear(this._record.position);
    this._unsaved = false;
    this._recordFilePath = undefined;
    this.onResetRecord();
  }

  importRecord(data: string, option?: ImportRecordOption): Error | undefined {
    let recordOrError: Record | Error;
    const type = option?.type || detectRecordFormat(data);
    switch (type) {
      case RecordFormatType.SFEN: {
        const position = Position.newBySFEN(data);
        recordOrError = position ? new Record(position) : new Error(t.failedToParseSFEN);
        break;
      }
      case RecordFormatType.USI:
        recordOrError = Record.newByUSI(data);
        break;
      case RecordFormatType.KIF:
        recordOrError = importKIF(data);
        break;
      case RecordFormatType.KI2:
        recordOrError = importKI2(data);
        break;
      case RecordFormatType.CSA:
        recordOrError = importCSA(data);
        break;
      case RecordFormatType.JKF:
        recordOrError = importJKFString(data);
        break;
      default:
        recordOrError = new Error(t.failedToDetectRecordFormat);
        break;
    }
    if (recordOrError instanceof Error) {
      return localizeError(recordOrError);
    }
    this.saveBackupOnBackground();
    this._record = recordOrError;
    this.bindRecordHandlers();
    this._unsaved = !option?.markAsSaved;
    this._recordFilePath = undefined;
    restoreCustomData(this._record);
    this.onResetRecord();
    return;
  }

  importRecordFromBuffer(
    data: Uint8Array,
    path: string,
    option?: { autoDetect?: boolean },
  ): Error | undefined {
    const format = detectRecordFileFormatByPath(path);
    if (!format) {
      return new Error(`${t.unknownFileExtension}: ${path}`);
    }
    const recordOrError = importRecordFromBuffer(data, format, option);
    if (recordOrError instanceof Error) {
      return localizeError(recordOrError);
    }
    this.saveBackupOnBackground();
    this._record = recordOrError;
    this.bindRecordHandlers();
    this._unsaved = false;
    this.updateRecordFilePath(path);
    restoreCustomData(this._record);
    this.onResetRecord();
    return;
  }

  exportRecordAsBuffer(path: string, opt: ExportOptions): ExportResult | Error {
    const format = detectRecordFileFormatByPath(path);
    if (!format) {
      return new Error(`${t.unknownFileExtension}: ${path}`);
    }
    const result = exportRecordAsBuffer(this._record, format, opt);
    this._unsaved = false;
    this.updateRecordFilePath(path);
    return result;
  }

  swapNextTurn(): void {
    const position = this.record.position.clone();
    position.setColor(reverseColor(position.color));
    this._record.clear(position);
    this._unsaved = true;
    this._recordFilePath = undefined;
    this.onResetRecord();
  }

  changePosition(change: PositionChange): void {
    const position = this.record.position.clone();
    position.edit(change);
    this._record.clear(position);
    this._unsaved = true;
    this._recordFilePath = undefined;
    this.onResetRecord();
  }

  changePly(ply: number): void {
    this._record.goto(ply);
  }

  changeBranch(index: number): boolean {
    return this._record.switchBranchByIndex(index);
  }

  swapWithNextBranch(): boolean {
    if (this._record.swapWithNextBranch()) {
      this._unsaved = true;
      return true;
    }
    return false;
  }

  swapWithPreviousBranch(): boolean {
    if (this._record.swapWithPreviousBranch()) {
      this._unsaved = true;
      return true;
    }
    return false;
  }

  removeCurrentMove(): boolean {
    if (this._record.removeCurrentMove()) {
      this._unsaved = true;
      return true;
    }
    return false;
  }

  removeNextMove(): boolean {
    if (this._record.removeNextMove()) {
      this._unsaved = true;
      return true;
    }
    return false;
  }

  jumpToBookmark(bookmark: string): boolean {
    return this._record.jumpToBookmark(bookmark);
  }

  updateComment(comment: string): void {
    this._record.current.comment = comment;
    this._unsaved = true;
  }

  updateBookmark(bookmark: string): void {
    this._record.current.bookmark = bookmark;
    this._unsaved = true;
  }

  appendComment(add: string, behavior: CommentBehavior): void {
    if (!add) {
      return;
    }
    const org = this._record.current.comment;
    const sep = this.record.current.comment ? "\n" : "";
    switch (behavior) {
      case CommentBehavior.NONE:
        break;
      case CommentBehavior.INSERT:
        this._record.current.comment = add + sep + org;
        break;
      case CommentBehavior.APPEND:
        this._record.current.comment = org + sep + add;
        break;
      case CommentBehavior.OVERWRITE:
        this._record.current.comment = add;
        break;
    }
    this._unsaved = true;
  }

  appendSearchComment(
    type: SearchInfoSenderType,
    searchInfo: SearchInfo,
    behavior: CommentBehavior,
    options?: {
      header?: string;
      engineName?: string;
    },
  ): void {
    let comment = buildSearchComment(this.record.position, type, searchInfo, options);
    if (options?.header) {
      comment = options.header + "\n" + comment;
    }
    this.appendComment(comment, behavior);
    this._unsaved = true;
  }

  get inCommentPVs(): Move[][] {
    return getPVsFromSearchComment(this.record.position, this.record.current.comment);
  }

  setGameStartMetadata(metadata: GameStartMetadata): void {
    if (metadata.gameTitle) {
      this._record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, metadata.gameTitle);
    }
    if (metadata.blackName) {
      this._record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, metadata.blackName);
    }
    if (metadata.whiteName) {
      this._record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, metadata.whiteName);
    }
    this._record.metadata.setStandardMetadata(RecordMetadataKey.DATE, getDateString());
    this._record.metadata.setStandardMetadata(
      RecordMetadataKey.START_DATETIME,
      getDateTimeString(),
    );
    if (metadata.timeLimit) {
      this._record.metadata.setStandardMetadata(
        RecordMetadataKey.TIME_LIMIT,
        formatTimeLimitCSA(metadata.timeLimit),
      );
    }
    this._unsaved = true;
  }

  setGameEndMetadata(): void {
    this._record.metadata.setStandardMetadata(RecordMetadataKey.END_DATETIME, getDateTimeString());
    this._unsaved = true;
  }

  updateSearchInfo(type: SearchInfoSenderType, searchInfo: SearchInfo): void {
    const data = (this.record.current.customData || {}) as RecordCustomData;
    switch (type) {
      case SearchInfoSenderType.PLAYER:
        data.playerSearchInfo = searchInfo;
        break;
      case SearchInfoSenderType.OPPONENT:
        data.opponentSearchInfo = searchInfo;
        break;
      case SearchInfoSenderType.RESEARCHER:
        if ((searchInfo.depth || 0) >= (data.researchInfo?.depth || 0)) {
          data.researchInfo = searchInfo;
        }
        break;
      case SearchInfoSenderType.RESEARCHER_2:
        if ((searchInfo.depth || 0) >= (data.researchInfo2?.depth || 0)) {
          data.researchInfo2 = searchInfo;
        }
        break;
      case SearchInfoSenderType.RESEARCHER_3:
        if ((searchInfo.depth || 0) >= (data.researchInfo3?.depth || 0)) {
          data.researchInfo3 = searchInfo;
        }
        break;
      case SearchInfoSenderType.RESEARCHER_4:
        if ((searchInfo.depth || 0) >= (data.researchInfo4?.depth || 0)) {
          data.researchInfo4 = searchInfo;
        }
        break;
    }
    this._record.current.customData = data;
    this.onUpdateCustomData();
  }

  appendMove(params: AppendMoveParams): boolean {
    const ok = this._record.append(params.move, params.moveOption);
    if (!ok) {
      return false;
    }
    if (params.elapsedMs !== undefined) {
      this._record.current.setElapsedMs(params.elapsedMs);
    }
    this._unsaved = true;
    return true;
  }

  appendMovesSilently(moves: Move[], opt?: DoMoveOption): number {
    this.unbindRecordHandlers();
    try {
      let n = 0;
      const ply = this._record.current.ply;
      for (const move of moves) {
        if (!this._record.append(move, opt)) {
          break;
        }
        n++;
      }
      this._record.goto(ply);
      this._unsaved = true;
      this.onUpdateFollowingMoves();
      return n;
    } finally {
      this.bindRecordHandlers();
    }
  }

  updateStandardMetadata(update: { key: RecordMetadataKey; value: string }): void {
    this._record.metadata.setStandardMetadata(update.key, update.value);
    this._unsaved = true;
  }

  on(event: "resetRecord", handler: ResetRecordHandler): void;
  on(event: "changePosition", handler: ChangePositionHandler): void;
  on(event: "updateCustomData", handler: UpdateCustomDataHandler): void;
  on(event: "updateFollowingMoves", handler: UpdateFollowingMovesHandler): void;
  on(event: string, handler: unknown): void {
    switch (event) {
      case "resetRecord":
        this.onResetRecord = handler as () => void;
        break;
      case "changePosition":
        this.onChangePosition = handler as () => void;
        this.bindRecordHandlers();
        break;
      case "updateCustomData":
        this.onUpdateCustomData = handler as () => void;
        break;
      case "updateFollowingMoves":
        this.onUpdateFollowingMoves = handler as () => void;
        break;
    }
  }

  private bindRecordHandlers(): void {
    this._record.on("changePosition", this.onChangePosition);
  }

  private unbindRecordHandlers(): void {
    this._record.on("changePosition", () => {
      /* noop */
    });
  }
}
