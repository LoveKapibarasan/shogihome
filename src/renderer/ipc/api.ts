import { USIEngineSetting, USIEngineSettings } from "@/common/settings/usi";
import { GameSetting } from "@/common/settings/game";
import { AppSetting } from "@/common/settings/app";
import { MenuEvent } from "@/common/control/menu";
import { webAPI } from "./web";
import { ResearchSetting } from "@/common/settings/research";
import { AppState } from "@/common/control/state";
import { GameResult } from "@/common/game/result";
import { AnalysisSetting } from "@/common/settings/analysis";
import { LogLevel, LogType } from "@/common/log";
import { CSAGameResult, CSASpecialMove } from "@/common/game/csa";
import { CSAGameSettingHistory, CSAServerSetting } from "@/common/settings/csa";
import { Rect } from "@/common/assets/geometry";
import { MateSearchSetting } from "@/common/settings/mate";
import { BatchConversionSetting } from "@/common/settings/conversion";
import { BatchConversionResult } from "@/common/file/conversion";
import { RecordFileHistory } from "@/common/file/history";
import { InitialRecordFileRequest } from "@/common/file/record";
import { VersionStatus } from "@/background/version/types";
import { TimeStates } from "@/common/game/time";

type AppInfo = {
  appVersion?: string;
};

export interface Bridge {
  fetchInitialRecordFileRequest(): Promise<string>;
  updateAppState(appState: AppState, bussy: boolean): void;
  openExplorer(path: string): void;
  openWebBrowser(url: string): void;
  showOpenRecordDialog(): Promise<string>;
  openRecord(path: string): Promise<Uint8Array>;
  cropPieceImage(srcURL: string, deleteMargin: boolean): Promise<string>;
  showSaveRecordDialog(defaultPath: string): Promise<string>;
  saveRecord(path: string, data: Uint8Array): Promise<void>;
  showSelectFileDialog(): Promise<string>;
  showSelectDirectoryDialog(defaultPath?: string): Promise<string>;
  showSelectImageDialog(defaultURL?: string): Promise<string>;
  showSaveMergedRecordDialog(defaultPath: string): Promise<string>;
  exportCaptureAsPNG(json: string): Promise<void>;
  exportCaptureAsJPEG(json: string): Promise<void>;
  convertRecordFiles(json: string): Promise<string>;
  loadAppSetting(): Promise<string>;
  saveAppSetting(setting: string): Promise<void>;
  loadBatchConversionSetting(): Promise<string>;
  saveBatchConversionSetting(setting: string): Promise<void>;
  loadResearchSetting(): Promise<string>;
  saveResearchSetting(setting: string): Promise<void>;
  loadAnalysisSetting(): Promise<string>;
  saveAnalysisSetting(setting: string): Promise<void>;
  loadGameSetting(): Promise<string>;
  saveGameSetting(setting: string): Promise<void>;
  loadCSAGameSettingHistory(): Promise<string>;
  saveCSAGameSettingHistory(setting: string): Promise<void>;
  loadMateSearchSetting(): Promise<string>;
  saveMateSearchSetting(setting: string): Promise<void>;
  loadRecordFileHistory(): Promise<string>;
  addRecordFileHistory(path: string): void;
  clearRecordFileHistory(): Promise<void>;
  saveRecordFileBackup(kif: string): Promise<void>;
  loadRecordFileBackup(name: string): Promise<string>;
  loadUSIEngineSetting(): Promise<string>;
  saveUSIEngineSetting(setting: string): Promise<void>;
  showSelectUSIEngineDialog(): Promise<string>;
  getUSIEngineInfo(path: string, timeoutSeconds: number): Promise<string>;
  sendUSISetOption(path: string, name: string, timeoutSeconds: number): Promise<void>;
  usiLaunch(json: string, timeoutSeconds: number): Promise<number>;
  usiReady(sessionID: number): Promise<void>;
  usiGo(sessionID: number, usi: string, timeStatesJSON: string): Promise<void>;
  usiGoPonder(sessionID: number, usi: string, timeStatesJSON: string): Promise<void>;
  usiPonderHit(sessionID: number): Promise<void>;
  usiGoInfinite(sessionID: number, usi: string): Promise<void>;
  usiGoMate(sessionID: number, usi: string): Promise<void>;
  usiStop(sessionID: number): Promise<void>;
  usiGameover(sessionID: number, result: GameResult): Promise<void>;
  usiQuit(sessionID: number): Promise<void>;
  csaLogin(json: string): Promise<number>;
  csaLogout(sessionID: number): Promise<void>;
  csaAgree(sessionID: number, gameID: string): Promise<void>;
  csaMove(sessionID: number, move: string, score?: number, pv?: string): Promise<void>;
  csaResign(sessionID: number): Promise<void>;
  csaWin(sessionID: number): Promise<void>;
  csaStop(sessionID: number): Promise<void>;
  isEncryptionAvailable(): Promise<boolean>;
  getVersionStatus(): Promise<string>;
  sendTestNotification(): void;
  openLogFile(logType: LogType): void;
  log(level: LogLevel, message: string): void;
  onClosable(): void;
  onClose(callback: () => void): void;
  onSendError(callback: (e: Error) => void): void;
  onMenuEvent(callback: (event: MenuEvent) => void): void;
  updateAppSetting(callback: (json: string) => void): void;
  onOpenRecord(callback: (path: string) => void): void;
  onUSIBestMove(
    callback: (sessionID: number, usi: string, usiMove: string, ponder?: string) => void,
  ): void;
  onUSICheckmate(callback: (sessionID: number, usi: string, usiMoves: string[]) => void): void;
  onUSICheckmateNotImplemented(callback: (sessionID: number) => void): void;
  onUSICheckmateTimeout(callback: (sessionID: number, usi: string) => void): void;
  onUSINoMate(callback: (sessionID: number, usi: string) => void): void;
  onUSIInfo(callback: (sessionID: number, usi: string, json: string) => void): void;
  onUSIPonderInfo(callback: (sessionID: number, usi: string, json: string) => void): void;
  onCSAGameSummary(callback: (sessionID: number, gameSummary: string) => void): void;
  onCSAReject(callback: (sessionID: number) => void): void;
  onCSAStart(callback: (sessionID: number, playerStates: string) => void): void;
  onCSAMove(callback: (sessionID: number, mvoe: string, playerStates: string) => void): void;
  onCSAGameResult(
    callback: (sessionID: number, specialMove: CSASpecialMove, gameResult: CSAGameResult) => void,
  ): void;
  onCSAClose(callback: (sessionID: number) => void): void;
}

export interface API {
  fetchInitialRecordFileRequest(): Promise<InitialRecordFileRequest>;
  updateAppState(appState: AppState, bussy: boolean): void;
  openExplorer(path: string): void;
  openWebBrowser(url: string): void;
  showOpenRecordDialog(): Promise<string>;
  openRecord(path: string): Promise<Uint8Array>;
  cropPieceImage(srcURL: string, deleteMargin: boolean): Promise<string>;
  showSaveRecordDialog(defaultPath: string): Promise<string>;
  saveRecord(path: string, data: Uint8Array): Promise<void>;
  showSelectFileDialog(): Promise<string>;
  showSelectDirectoryDialog(defaultPath?: string): Promise<string>;
  showSelectImageDialog(defaultURL?: string): Promise<string>;
  showSaveMergedRecordDialog(defaultPath: string): Promise<string>;
  exportCaptureAsPNG(rect: Rect): Promise<void>;
  exportCaptureAsJPEG(rect: Rect): Promise<void>;
  convertRecordFiles(setting: BatchConversionSetting): Promise<BatchConversionResult>;
  loadAppSetting(): Promise<AppSetting>;
  saveAppSetting(setting: AppSetting): Promise<void>;
  loadBatchConversionSetting(): Promise<BatchConversionSetting>;
  saveBatchConversionSetting(setting: BatchConversionSetting): Promise<void>;
  loadResearchSetting(): Promise<ResearchSetting>;
  saveResearchSetting(setting: ResearchSetting): Promise<void>;
  loadAnalysisSetting(): Promise<AnalysisSetting>;
  saveAnalysisSetting(setting: AnalysisSetting): Promise<void>;
  loadGameSetting(): Promise<GameSetting>;
  saveGameSetting(setting: GameSetting): Promise<void>;
  loadCSAGameSettingHistory(): Promise<CSAGameSettingHistory>;
  saveCSAGameSettingHistory(setting: CSAGameSettingHistory): Promise<void>;
  loadMateSearchSetting(): Promise<MateSearchSetting>;
  saveMateSearchSetting(setting: MateSearchSetting): Promise<void>;
  loadRecordFileHistory(): Promise<RecordFileHistory>;
  addRecordFileHistory(path: string): void;
  clearRecordFileHistory(): Promise<void>;
  saveRecordFileBackup(kif: string): Promise<void>;
  loadRecordFileBackup(name: string): Promise<string>;
  loadUSIEngineSetting(): Promise<USIEngineSettings>;
  saveUSIEngineSetting(setting: USIEngineSettings): Promise<void>;
  showSelectUSIEngineDialog(): Promise<string>;
  getUSIEngineInfo(path: string, timeoutSeconds: number): Promise<USIEngineSetting>;
  sendUSISetOption(path: string, name: string, timeoutSeconds: number): Promise<void>;
  usiLaunch(setting: USIEngineSetting, timeoutSeconds: number): Promise<number>;
  usiReady(sessionID: number): Promise<void>;
  usiGo(sessionID: number, usi: string, timeStates: TimeStates): Promise<void>;
  usiGoPonder(sessionID: number, usi: string, timeStates: TimeStates): Promise<void>;
  usiPonderHit(sessionID: number): Promise<void>;
  usiGoInfinite(sessionID: number, usi: string): Promise<void>;
  usiGoMate(sessionID: number, usi: string): Promise<void>;
  usiStop(sessionID: number): Promise<void>;
  usiGameover(sessionID: number, result: GameResult): Promise<void>;
  usiQuit(sessionID: number): Promise<void>;
  csaLogin(setting: CSAServerSetting): Promise<number>;
  csaLogout(sessionID: number): Promise<void>;
  csaAgree(sessionID: number, gameID: string): Promise<void>;
  csaMove(sessionID: number, move: string, score?: number, pv?: string): Promise<void>;
  csaResign(sessionID: number): Promise<void>;
  csaWin(sessionID: number): Promise<void>;
  csaStop(sessionID: number): Promise<void>;
  isEncryptionAvailable(): Promise<boolean>;
  getVersionStatus(): Promise<VersionStatus>;
  sendTestNotification(): void;
  openLogFile(logType: LogType): void;
  log(level: LogLevel, message: string): void;
}

interface ExtendedWindow extends Window {
  electronShogi?: AppInfo;
  electronShogiAPI?: Bridge;
}

function getWindowObject(): ExtendedWindow {
  return window as unknown as ExtendedWindow;
}

export const appInfo: AppInfo = getWindowObject().electronShogi || {};

export const bridge: Bridge = getWindowObject().electronShogiAPI || webAPI;

const api: API = {
  ...bridge,
  async fetchInitialRecordFileRequest(): Promise<InitialRecordFileRequest> {
    return JSON.parse(await bridge.fetchInitialRecordFileRequest());
  },
  exportCaptureAsPNG(rect: Rect): Promise<void> {
    return bridge.exportCaptureAsPNG(rect.json);
  },
  exportCaptureAsJPEG(rect: Rect): Promise<void> {
    return bridge.exportCaptureAsJPEG(rect.json);
  },
  async convertRecordFiles(setting: BatchConversionSetting): Promise<BatchConversionResult> {
    return JSON.parse(await bridge.convertRecordFiles(JSON.stringify(setting)));
  },
  async loadAppSetting(): Promise<AppSetting> {
    return JSON.parse(await bridge.loadAppSetting());
  },
  saveAppSetting(setting: AppSetting): Promise<void> {
    return bridge.saveAppSetting(JSON.stringify(setting));
  },
  async loadBatchConversionSetting(): Promise<BatchConversionSetting> {
    return JSON.parse(await bridge.loadBatchConversionSetting());
  },
  saveBatchConversionSetting(setting: BatchConversionSetting): Promise<void> {
    return bridge.saveBatchConversionSetting(JSON.stringify(setting));
  },
  async loadResearchSetting(): Promise<ResearchSetting> {
    return JSON.parse(await bridge.loadResearchSetting());
  },
  saveResearchSetting(setting: ResearchSetting): Promise<void> {
    return bridge.saveResearchSetting(JSON.stringify(setting));
  },
  async loadAnalysisSetting(): Promise<AnalysisSetting> {
    return JSON.parse(await bridge.loadAnalysisSetting());
  },
  saveAnalysisSetting(setting: AnalysisSetting): Promise<void> {
    return bridge.saveAnalysisSetting(JSON.stringify(setting));
  },
  async loadGameSetting(): Promise<GameSetting> {
    return JSON.parse(await bridge.loadGameSetting());
  },
  saveGameSetting(setting: GameSetting): Promise<void> {
    return bridge.saveGameSetting(JSON.stringify(setting));
  },
  async loadCSAGameSettingHistory(): Promise<CSAGameSettingHistory> {
    return JSON.parse(await bridge.loadCSAGameSettingHistory());
  },
  saveCSAGameSettingHistory(setting: CSAGameSettingHistory): Promise<void> {
    return bridge.saveCSAGameSettingHistory(JSON.stringify(setting));
  },
  async loadMateSearchSetting(): Promise<MateSearchSetting> {
    return JSON.parse(await bridge.loadMateSearchSetting());
  },
  saveMateSearchSetting(setting: MateSearchSetting): Promise<void> {
    return bridge.saveMateSearchSetting(JSON.stringify(setting));
  },
  async loadRecordFileHistory(): Promise<RecordFileHistory> {
    return JSON.parse(await bridge.loadRecordFileHistory());
  },
  async loadUSIEngineSetting(): Promise<USIEngineSettings> {
    return new USIEngineSettings(await bridge.loadUSIEngineSetting());
  },
  saveUSIEngineSetting(settings: USIEngineSettings): Promise<void> {
    return bridge.saveUSIEngineSetting(settings.json);
  },
  async getUSIEngineInfo(path: string, timeoutSeconds: number): Promise<USIEngineSetting> {
    return JSON.parse(await bridge.getUSIEngineInfo(path, timeoutSeconds));
  },
  usiLaunch(setting: USIEngineSetting, timeoutSeconds: number): Promise<number> {
    return bridge.usiLaunch(JSON.stringify(setting), timeoutSeconds);
  },
  usiReady(sessionID: number): Promise<void> {
    return bridge.usiReady(sessionID);
  },
  usiGo(sessionID: number, usi: string, timeStates: TimeStates): Promise<void> {
    return bridge.usiGo(sessionID, usi, JSON.stringify(timeStates));
  },
  usiGoPonder(sessionID: number, usi: string, timeStates: TimeStates): Promise<void> {
    return bridge.usiGoPonder(sessionID, usi, JSON.stringify(timeStates));
  },
  csaLogin(setting: CSAServerSetting): Promise<number> {
    return bridge.csaLogin(JSON.stringify(setting));
  },
  async getVersionStatus(): Promise<VersionStatus> {
    return JSON.parse(await bridge.getVersionStatus());
  },
};

export default api;

export function isNative(): boolean {
  return !!getWindowObject().electronShogiAPI;
}
