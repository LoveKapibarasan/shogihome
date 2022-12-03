import { BrowserWindow, dialog, ipcMain, WebContents } from "electron";
import { Background, Renderer } from "@/ipc/channel";
import path from "path";
import fs from "fs";
import {
  loadAnalysisSetting,
  loadAppSetting,
  loadCSAGameSettingHistory,
  loadGameSetting,
  loadResearchSetting,
  loadUSIEngineSetting,
  saveAnalysisSetting,
  saveAppSetting,
  saveCSAGameSettingHistory,
  saveGameSetting,
  saveResearchSetting,
  saveUSIEngineSetting,
} from "@/ipc/background/settings";
import { USIEngineSetting, USIEngineSettings } from "@/settings/usi";
import { setupMenu, updateMenuState } from "@/ipc/background/menu";
import { MenuEvent } from "@/ipc/menu";
import { USIInfoCommand, USIInfoSender } from "@/ipc/usi";
import { AppState } from "@/store/state";
import {
  gameover as usiGameover,
  getUSIEngineInfo as usiGetUSIEngineInfo,
  go as usiGo,
  goPonder as usiGoPonder,
  goInfinite as usiGoInfinite,
  ponderHit as usiPonderHit,
  quit as usiQuit,
  sendSetOptionCommand as usiSendSetOptionCommand,
  setupPlayer as usiSetupPlayer,
  stop as usiStop,
} from "@/ipc/background/usi";
import { GameResult } from "@/players/player";
import { LogLevel } from "@/ipc/log";
import { getAppLogger } from "./log";
import {
  login as csaLogin,
  logout as csaLogout,
  agree as csaAgree,
  doMove as csaDoMove,
  resign as csaResign,
  win as csaWin,
  stop as csaStop,
} from "./csa";
import {
  CSAGameResult,
  CSAGameSummary,
  CSAPlayerStates,
  CSASpecialMove,
} from "@/ipc/csa";
import { CSAServerSetting } from "@/settings/csa";
import { isEncryptionAvailable } from "./encrypt";

const isWindows = process.platform === "win32";

let mainWindow: BrowserWindow;
let appState = AppState.NORMAL;

export function setup(win: BrowserWindow): void {
  mainWindow = win;
  setupMenu();
}

export function getAppState(): AppState {
  return appState;
}

export function getWebContents(): WebContents {
  return mainWindow.webContents;
}

ipcMain.handle(Background.GET_RECORD_PATH_FROM_PROC_ARG, () => {
  const path = process.argv[process.argv.length - 1];
  if (isValidRecordFilePath(path)) {
    return path;
  }
});

ipcMain.on(
  Background.UPDATE_MENU_STATE,
  (_, state: AppState, bussy: boolean) => {
    appState = state;
    updateMenuState(state, bussy);
  }
);

function isValidRecordFilePath(path: string) {
  return (
    path.endsWith(".kif") || path.endsWith(".kifu") || path.endsWith(".csa")
  );
}

ipcMain.handle(
  Background.SHOW_OPEN_RECORD_DIALOG,
  async (): Promise<string> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      throw "予期せぬエラーでダイアログを表示せきません。";
    }
    const results = dialog.showOpenDialogSync(win, {
      properties: ["openFile"],
      filters: [{ name: "棋譜ファイル", extensions: ["kif", "kifu", "csa"] }],
    });
    return results && results.length === 1 ? results[0] : "";
  }
);

ipcMain.handle(
  Background.OPEN_RECORD,
  async (_, path: string): Promise<Uint8Array> => {
    if (!isValidRecordFilePath(path)) {
      throw new Error(`取り扱いできないファイル拡張子です`);
    }
    return fs.promises.readFile(path);
  }
);

ipcMain.handle(
  Background.SHOW_SAVE_RECORD_DIALOG,
  async (_, defaultPath: string): Promise<string> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      throw "予期せぬエラーでダイアログを表示せきません。";
    }
    const result = dialog.showSaveDialogSync(win, {
      defaultPath: defaultPath,
      properties: ["createDirectory", "showOverwriteConfirmation"],
      filters: [
        { name: "KIF形式 (Shift-JIS)", extensions: ["kif"] },
        { name: "KIF形式 (UTF-8)", extensions: ["kifu"] },
        { name: "CSA形式", extensions: ["csa"] },
      ],
    });
    return result ? result : "";
  }
);

ipcMain.handle(
  Background.SAVE_RECORD,
  async (_, filePath: string, data: Uint8Array): Promise<void> => {
    if (!isValidRecordFilePath(filePath)) {
      throw new Error(`取り扱いできないファイル拡張子です`);
    }
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.promises.writeFile(filePath, data);
  }
);

ipcMain.handle(
  Background.SHOW_SELECT_FILE_DIALOG,
  async (): Promise<string> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      throw "予期せぬエラーでダイアログを表示せきません。";
    }
    const results = dialog.showOpenDialogSync(win, {
      properties: ["openFile"],
    });
    return results && results.length === 1 ? results[0] : "";
  }
);

ipcMain.handle(
  Background.SHOW_SELECT_DIRECTORY_DIALOG,
  async (_, defaultPath?: string): Promise<string> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      throw "予期せぬエラーでダイアログを表示せきません。";
    }
    const results = dialog.showOpenDialogSync(win, {
      properties: ["createDirectory", "openDirectory"],
      defaultPath: defaultPath,
    });
    return results && results.length === 1 ? results[0] : "";
  }
);

ipcMain.handle(Background.LOAD_APP_SETTING, (): string => {
  return JSON.stringify(loadAppSetting());
});

ipcMain.handle(Background.SAVE_APP_SETTING, (_, json: string): void => {
  saveAppSetting(JSON.parse(json));
});

ipcMain.handle(Background.LOAD_RESEARCH_SETTING, (): string => {
  return JSON.stringify(loadResearchSetting());
});

ipcMain.handle(Background.SAVE_RESEARCH_SETTING, (_, json: string): void => {
  saveResearchSetting(JSON.parse(json));
});

ipcMain.handle(Background.LOAD_ANALYSIS_SETTING, (): string => {
  return JSON.stringify(loadAnalysisSetting());
});

ipcMain.handle(Background.SAVE_ANALYSIS_SETTING, (_, json: string): void => {
  saveAnalysisSetting(JSON.parse(json));
});

ipcMain.handle(Background.LOAD_GAME_SETTING, (): string => {
  return JSON.stringify(loadGameSetting());
});

ipcMain.handle(Background.SAVE_GAME_SETTING, (_, json: string): void => {
  saveGameSetting(JSON.parse(json));
});

ipcMain.handle(Background.LOAD_CSA_GAME_SETTING_HISTORY, (): string => {
  return JSON.stringify(loadCSAGameSettingHistory());
});

ipcMain.handle(
  Background.SAVE_CSA_GAME_SETTING_HISTORY,
  (_, json: string): void => {
    saveCSAGameSettingHistory(JSON.parse(json));
  }
);

ipcMain.handle(Background.LOAD_USI_ENGINE_SETTING, (): string => {
  return loadUSIEngineSetting().json;
});

ipcMain.handle(Background.SAVE_USI_ENGINE_SETTING, (_, json: string): void => {
  saveUSIEngineSetting(new USIEngineSettings(json));
});

ipcMain.handle(Background.SHOW_SELECT_USI_ENGINE_DIALOG, (): string => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    throw "予期せぬエラーでダイアログを表示せきません。";
  }
  const results = dialog.showOpenDialogSync(win, {
    properties: ["openFile", "noResolveAliases"],
    filters: isWindows
      ? [{ name: "実行可能ファイル", extensions: ["exe", "cmd", "bat"] }]
      : undefined,
  });
  return results && results.length === 1 ? results[0] : "";
});

ipcMain.handle(
  Background.GET_USI_ENGINE_INFO,
  async (_, path: string): Promise<string> => {
    return JSON.stringify(await usiGetUSIEngineInfo(path));
  }
);

ipcMain.handle(
  Background.SEND_USI_SET_OPTION,
  async (_, path: string, name: string) => {
    await usiSendSetOptionCommand(path, name);
  }
);

ipcMain.handle(Background.LAUNCH_USI, async (_, json: string) => {
  const setting = JSON.parse(json) as USIEngineSetting;
  return await usiSetupPlayer(setting);
});

ipcMain.handle(
  Background.USI_GO,
  (
    _,
    sessionID: number,
    usi: string,
    json: string,
    blackTimeMs: number,
    whiteTimeMs: number
  ) => {
    const timeLimit = JSON.parse(json);
    usiGo(sessionID, usi, timeLimit, blackTimeMs, whiteTimeMs);
  }
);

ipcMain.handle(
  Background.USI_GO_PONDER,
  (
    _,
    sessionID: number,
    usi: string,
    json: string,
    blackTimeMs: number,
    whiteTimeMs: number
  ) => {
    const timeLimit = JSON.parse(json);
    usiGoPonder(sessionID, usi, timeLimit, blackTimeMs, whiteTimeMs);
  }
);

ipcMain.handle(Background.USI_GO_PONDER_HIT, (_, sessionID: number) => {
  usiPonderHit(sessionID);
});

ipcMain.handle(
  Background.USI_GO_INFINITE,
  (_, sessionID: number, usi: string) => {
    usiGoInfinite(sessionID, usi);
  }
);

ipcMain.handle(Background.USI_STOP, (_, sessionID: number) => {
  usiStop(sessionID);
});

ipcMain.handle(
  Background.USI_GAMEOVER,
  (_, sessionID: number, result: GameResult) => {
    usiGameover(sessionID, result);
  }
);

ipcMain.handle(Background.USI_QUIT, (_, sessionID: number) => {
  usiQuit(sessionID);
});

ipcMain.handle(Background.CSA_LOGIN, (_, json: string): number => {
  const setting: CSAServerSetting = JSON.parse(json);
  return csaLogin(setting);
});

ipcMain.handle(Background.CSA_LOGOUT, (_, sessionID: number): void => {
  csaLogout(sessionID);
});

ipcMain.handle(
  Background.CSA_AGREE,
  (_, sessionID: number, gameID: string): void => {
    csaAgree(sessionID, gameID);
  }
);

ipcMain.handle(
  Background.CSA_MOVE,
  (_, sessionID: number, move: string, score?: number): void => {
    csaDoMove(sessionID, move, score);
  }
);

ipcMain.handle(Background.CSA_RESIGN, (_, sessionID: number): void => {
  csaResign(sessionID);
});

ipcMain.handle(Background.CSA_WIN, (_, sessionID: number): void => {
  csaWin(sessionID);
});

ipcMain.handle(Background.CSA_STOP, (_, sessionID: number): void => {
  csaStop(sessionID);
});

ipcMain.handle(Background.IS_ENCRYPTION_AVAILABLE, (): boolean => {
  return isEncryptionAvailable();
});

ipcMain.handle(Background.LOG, (_, level: LogLevel, message: string) => {
  switch (level) {
    case LogLevel.INFO:
      getAppLogger().info("%s", message);
      break;
    case LogLevel.WARN:
      getAppLogger().warn("%s", message);
      break;
    case LogLevel.ERROR:
      getAppLogger().error("%s", message);
      break;
  }
});

export function sendError(e: Error): void {
  mainWindow.webContents.send(Renderer.SEND_ERROR, e);
}

export function onMenuEvent(event: MenuEvent): void {
  mainWindow.webContents.send(Renderer.MENU_EVENT, event);
}

export function onUSIBestMove(
  sessionID: number,
  usi: string,
  sfen: string,
  ponder?: string
): void {
  mainWindow.webContents.send(
    Renderer.USI_BEST_MOVE,
    sessionID,
    usi,
    sfen,
    ponder
  );
}

export function onUSIInfo(
  sessionID: number,
  usi: string,
  sender: USIInfoSender,
  name: string,
  info: USIInfoCommand
): void {
  mainWindow.webContents.send(
    Renderer.USI_INFO,
    sessionID,
    usi,
    sender,
    name,
    JSON.stringify(info)
  );
}

export function onUSIPonderInfo(
  sessionID: number,
  usi: string,
  sender: USIInfoSender,
  name: string,
  info: USIInfoCommand
): void {
  mainWindow.webContents.send(
    Renderer.USI_PONDER_INFO,
    sessionID,
    usi,
    sender,
    name,
    JSON.stringify(info)
  );
}

export function onCSAGameSummary(
  sessionID: number,
  gameSummary: CSAGameSummary
): void {
  mainWindow.webContents.send(
    Renderer.CSA_GAME_SUMMARY,
    sessionID,
    JSON.stringify(gameSummary)
  );
}

export function onCSAReject(sessionID: number): void {
  mainWindow.webContents.send(Renderer.CSA_REJECT, sessionID);
}

export function onCSAStart(
  sessionID: number,
  playerStates: CSAPlayerStates
): void {
  mainWindow.webContents.send(
    Renderer.CSA_START,
    sessionID,
    JSON.stringify(playerStates)
  );
}

export function onCSAMove(
  sessionID: number,
  move: string,
  playerStates: CSAPlayerStates
): void {
  mainWindow.webContents.send(
    Renderer.CSA_MOVE,
    sessionID,
    move,
    JSON.stringify(playerStates)
  );
}

export function onCSAGameResult(
  sessionID: number,
  specialMove: CSASpecialMove,
  gameResult: CSAGameResult
): void {
  mainWindow.webContents.send(
    Renderer.CSA_GAME_RESULT,
    sessionID,
    specialMove,
    gameResult
  );
}

export function onCSAClose(sessionID: number): void {
  mainWindow.webContents.send(Renderer.CSA_CLOSE, sessionID);
}
