import { watch } from "vue";
import { InitialPositionType, SpecialMoveType } from "@/common/shogi";
import { useStore } from "@/renderer/store";
import {
  onUSIBestMove,
  onUSICheckmate,
  onUSICheckmateNotImplemented,
  onUSICheckmateTimeout,
  onUSIInfo,
  onUSIPonderInfo,
  onUSINoMate,
} from "@/renderer/players/usi";
import { humanPlayer } from "@/renderer/players/human";
import { bridge } from "./api";
import { MenuEvent } from "@/common/control/menu";
import { USIInfoCommand } from "@/common/usi";
import { AppState } from "@/common/control/state";
import {
  onCSAClose,
  onCSAGameResult,
  onCSAGameSummary,
  onCSAMove,
  onCSAReject,
  onCSAStart,
} from "@/renderer/store/csa";
import { useAppSetting } from "@/renderer/store/setting";
import { t } from "@/common/i18n";

export function setup(): void {
  const store = useStore();
  const appSetting = useAppSetting();
  bridge.onSendError((e: Error) => {
    store.pushError(e);
  });
  bridge.onMenuEvent((event: MenuEvent) => {
    if (store.isBussy) {
      return;
    }
    switch (event) {
      case MenuEvent.NEW_RECORD:
        store.resetRecord();
        break;
      case MenuEvent.OPEN_RECORD:
        store.openRecord();
        break;
      case MenuEvent.SAVE_RECORD:
        store.saveRecord({ overwrite: true });
        break;
      case MenuEvent.SAVE_RECORD_AS:
        store.saveRecord();
        break;
      case MenuEvent.EXPORT_POSITION_IMAGE:
        store.showExportBoardImageDialog();
        break;
      case MenuEvent.COPY_RECORD:
        store.copyRecordKIF();
        break;
      case MenuEvent.COPY_RECORD_CSA:
        store.copyRecordCSA();
        break;
      case MenuEvent.COPY_RECORD_USI_BEFORE:
        store.copyRecordUSIBefore();
        break;
      case MenuEvent.COPY_RECORD_USI_ALL:
        store.copyRecordUSIAll();
        break;
      case MenuEvent.COPY_BOARD_SFEN:
        store.copyBoardSFEN();
        break;
      case MenuEvent.PASTE_RECORD:
        store.showPasteDialog();
        break;
      case MenuEvent.INSERT_INTERRUPT:
        store.insertSpecialMove(SpecialMoveType.INTERRUPT);
        break;
      case MenuEvent.INSERT_RESIGN:
        store.insertSpecialMove(SpecialMoveType.RESIGN);
        break;
      case MenuEvent.INSERT_DRAW:
        store.insertSpecialMove(SpecialMoveType.DRAW);
        break;
      case MenuEvent.INSERT_IMPASS:
        store.insertSpecialMove(SpecialMoveType.IMPASS);
        break;
      case MenuEvent.INSERT_REPETITION_DRAW:
        store.insertSpecialMove(SpecialMoveType.REPETITION_DRAW);
        break;
      case MenuEvent.INSERT_MATE:
        store.insertSpecialMove(SpecialMoveType.MATE);
        break;
      case MenuEvent.INSERT_NO_MATE:
        store.insertSpecialMove(SpecialMoveType.NO_MATE);
        break;
      case MenuEvent.INSERT_TIMEOUT:
        store.insertSpecialMove(SpecialMoveType.TIMEOUT);
        break;
      case MenuEvent.INSERT_FOUL_WIN:
        store.insertSpecialMove(SpecialMoveType.FOUL_WIN);
        break;
      case MenuEvent.INSERT_FOUL_LOSE:
        store.insertSpecialMove(SpecialMoveType.FOUL_LOSE);
        break;
      case MenuEvent.INSERT_ENTERING_OF_KING:
        store.insertSpecialMove(SpecialMoveType.ENTERING_OF_KING);
        break;
      case MenuEvent.INSERT_WIN_BY_DEFAULT:
        store.insertSpecialMove(SpecialMoveType.WIN_BY_DEFAULT);
        break;
      case MenuEvent.INSERT_LOSE_BY_DEFAULT:
        store.insertSpecialMove(SpecialMoveType.LOSE_BY_DEFAULT);
        break;
      case MenuEvent.REMOVE_CURRENT_MOVE:
        store.removeCurrentMove();
        break;
      case MenuEvent.START_POSITION_EDITING:
        store.startPositionEditing();
        break;
      case MenuEvent.END_POSITION_EDITING:
        store.endPositionEditing();
        break;
      case MenuEvent.CHANGE_TURN:
        store.changeTurn();
        break;
      case MenuEvent.INIT_POSITION_STANDARD:
        store.initializePosition(InitialPositionType.STANDARD);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_LANCE:
        store.initializePosition(InitialPositionType.HANDICAP_LANCE);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_RIGHT_LANCE:
        store.initializePosition(InitialPositionType.HANDICAP_RIGHT_LANCE);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_BISHOP:
        store.initializePosition(InitialPositionType.HANDICAP_BISHOP);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_ROOK:
        store.initializePosition(InitialPositionType.HANDICAP_ROOK);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_ROOK_LANCE:
        store.initializePosition(InitialPositionType.HANDICAP_ROOK_LANCE);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_2PIECES:
        store.initializePosition(InitialPositionType.HANDICAP_2PIECES);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_4PIECES:
        store.initializePosition(InitialPositionType.HANDICAP_4PIECES);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_6PIECES:
        store.initializePosition(InitialPositionType.HANDICAP_6PIECES);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_8PIECES:
        store.initializePosition(InitialPositionType.HANDICAP_8PIECES);
        break;
      case MenuEvent.INIT_POSITION_HANDICAP_10PIECES:
        store.initializePosition(InitialPositionType.HANDICAP_10PIECES);
        break;
      case MenuEvent.INIT_POSITION_TSUME_SHOGI:
        store.initializePosition(InitialPositionType.TSUME_SHOGI);
        break;
      case MenuEvent.INIT_POSITION_TSUME_SHOGI_2KINGS:
        store.initializePosition(InitialPositionType.TSUME_SHOGI_2KINGS);
        break;
      case MenuEvent.START_MATE_SEARCH:
        store.showMateSearchDialog();
        break;
      case MenuEvent.STOP_MATE_SEARCH:
        store.stopMateSearch();
        break;
      case MenuEvent.START_GAME:
        store.showGameDialog();
        break;
      case MenuEvent.START_CSA_GAME:
        store.showCSAGameDialog();
        break;
      case MenuEvent.STOP_GAME:
        store.stopGame();
        break;
      case MenuEvent.RESIGN:
        humanPlayer.resign();
        break;
      case MenuEvent.WIN:
        humanPlayer.win();
        break;
      case MenuEvent.LOGOUT:
        store.cancelCSAGame();
        break;
      case MenuEvent.START_RESEARCH:
        store.showResearchDialog();
        break;
      case MenuEvent.STOP_RESEARCH:
        store.stopResearch();
        break;
      case MenuEvent.START_ANALYSIS:
        store.showAnalysisDialog();
        break;
      case MenuEvent.STOP_ANALYSIS:
        store.stopAnalysis();
        break;
      case MenuEvent.FLIP_BOARD:
        useAppSetting().flipBoard();
        break;
      case MenuEvent.APP_SETTING_DIALOG:
        store.showAppSettingDialog();
        break;
      case MenuEvent.USI_ENGINE_SETTING_DIALOG:
        store.showUsiEngineManagementDialog();
        break;
    }
  });
  bridge.onUpdateAppSetting((json: string) => {
    appSetting.updateAppSetting(JSON.parse(json));
  });
  bridge.onOpenRecord((path: string) => {
    store.showConfirmation({
      message: t.areYouSureWantToOpenFileInsteadOfCurrentRecord,
      onOk: () => {
        store.openRecord(path);
      },
    });
  });
  bridge.onUSIBestMove(onUSIBestMove);
  bridge.onUSICheckmate(onUSICheckmate);
  bridge.onUSICheckmateNotImplemented(onUSICheckmateNotImplemented);
  bridge.onUSICheckmateTimeout(onUSICheckmateTimeout);
  bridge.onUSINoMate(onUSINoMate);
  bridge.onUSIInfo((sessionID: number, usi: string, json: string) => {
    const info = JSON.parse(json) as USIInfoCommand;
    onUSIInfo(sessionID, usi, info);
  });
  bridge.onUSIPonderInfo((sessionID: number, usi: string, json: string) => {
    const info = JSON.parse(json) as USIInfoCommand;
    onUSIPonderInfo(sessionID, usi, info);
  });
  bridge.onCSAGameSummary((sessionID: number, gameSummary: string): void => {
    onCSAGameSummary(sessionID, JSON.parse(gameSummary));
  });
  bridge.onCSAReject(onCSAReject);
  bridge.onCSAStart((sessionID: number, playerStates: string): void => {
    onCSAStart(sessionID, JSON.parse(playerStates));
  });
  bridge.onCSAMove(
    (sessionID: number, move: string, playerStates: string): void => {
      onCSAMove(sessionID, move, JSON.parse(playerStates));
    }
  );
  bridge.onCSAGameResult(onCSAGameResult);
  bridge.onCSAClose(onCSAClose);
  watch(
    () => [store.appState, store.isBussy],
    ([appState, bussy]) =>
      bridge.updateAppState(appState as AppState, bussy as boolean)
  );
  bridge.updateAppState(store.appState, store.isBussy);
}
