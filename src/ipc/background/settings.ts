import fs from "fs";
import { app, shell } from "electron";
import path from "path";
import { USIEngineSettings } from "@/settings/usi";
import { AppSetting, defaultAppSetting } from "@/settings/app";
import { defaultWindowSetting, WindowSetting } from "@/settings/window";
import { defaultGameSetting, GameSetting } from "@/settings/game";
import { defaultResearchSetting, ResearchSetting } from "@/settings/research";
import { AnalysisSetting, defaultAnalysisSetting } from "@/settings/analysis";
import { getAppLogger } from "@/ipc/background/log";
import {
  CSAGameSettingHistory,
  decryptCSAGameSettingHistory,
  defaultCSAGameSettingHistory,
  defaultSecureCSAGameSettingHistory,
  encryptCSAGameSettingHistory,
} from "@/settings/csa";
import { DecryptString, EncryptString, isEncryptionAvailable } from "./encrypt";
import {
  defaultExtensionSettings,
  ExtensionSettings,
} from "@/settings/extension";

const rootDir = app.getPath("userData");
const docDir = path.join(app.getPath("documents"), "ElectronShogi");

export function openSettingsDirectory(): void {
  shell.openPath(rootDir);
}

export function openAutoSaveDirectory(): void {
  const appSetting = loadAppSetting();
  shell.openPath(appSetting.autoSaveDirectory || docDir);
}

const windowSettingPath = path.join(rootDir, "window.json");

export function saveWindowSetting(setting: WindowSetting): void {
  try {
    fs.writeFileSync(
      windowSettingPath,
      JSON.stringify(setting, undefined, 2),
      "utf8"
    );
  } catch (e) {
    getAppLogger().error("failed to write window setting: %s", e);
  }
}

export function loadWindowSetting(): WindowSetting {
  try {
    return {
      ...defaultWindowSetting(),
      ...JSON.parse(fs.readFileSync(windowSettingPath, "utf8")),
    };
  } catch (e) {
    getAppLogger().error("failed to read window setting: %s", e);
    return defaultWindowSetting();
  }
}

const usiEngineSettingPath = path.join(rootDir, "usi_engine.json");

export function saveUSIEngineSetting(setting: USIEngineSettings): void {
  fs.writeFileSync(usiEngineSettingPath, setting.jsonWithIndent, "utf8");
}

export function loadUSIEngineSetting(): USIEngineSettings {
  if (!fs.existsSync(usiEngineSettingPath)) {
    return new USIEngineSettings();
  }
  return new USIEngineSettings(fs.readFileSync(usiEngineSettingPath, "utf8"));
}

const appSettingPath = path.join(rootDir, "app_setting.json");

export function saveAppSetting(setting: AppSetting): void {
  fs.writeFileSync(
    appSettingPath,
    JSON.stringify(setting, undefined, 2),
    "utf8"
  );
}

export function loadAppSetting(): AppSetting {
  const defautlReturnCode = process.platform === "win32" ? "\r\n" : "\n";
  if (!fs.existsSync(appSettingPath)) {
    return defaultAppSetting({
      returnCode: defautlReturnCode,
      autoSaveDirectory: docDir,
    });
  }
  return {
    ...defaultAppSetting({
      returnCode: defautlReturnCode,
      autoSaveDirectory: docDir,
    }),
    ...JSON.parse(fs.readFileSync(appSettingPath, "utf8")),
  };
}

const gameSettingPath = path.join(rootDir, "game_setting.json");

export function saveGameSetting(setting: GameSetting): void {
  fs.writeFileSync(
    gameSettingPath,
    JSON.stringify(setting, undefined, 2),
    "utf8"
  );
}

export function loadGameSetting(): GameSetting {
  if (!fs.existsSync(gameSettingPath)) {
    return defaultGameSetting();
  }
  return {
    ...defaultGameSetting(),
    ...JSON.parse(fs.readFileSync(gameSettingPath, "utf8")),
  };
}

const csaGameSettingHistoryPath = path.join(
  rootDir,
  "csa_game_setting_history.json"
);

export function saveCSAGameSettingHistory(
  setting: CSAGameSettingHistory
): void {
  const encrypted = encryptCSAGameSettingHistory(
    setting,
    isEncryptionAvailable() ? EncryptString : undefined
  );
  fs.writeFileSync(
    csaGameSettingHistoryPath,
    JSON.stringify(encrypted, undefined, 2),
    "utf8"
  );
}

export function loadCSAGameSettingHistory(): CSAGameSettingHistory {
  if (!fs.existsSync(csaGameSettingHistoryPath)) {
    return defaultCSAGameSettingHistory();
  }
  const encrypted = JSON.parse(
    fs.readFileSync(csaGameSettingHistoryPath, "utf8")
  );
  return decryptCSAGameSettingHistory(
    {
      ...defaultSecureCSAGameSettingHistory(),
      ...encrypted,
    },
    isEncryptionAvailable() ? DecryptString : undefined
  );
}

const researchSettingPath = path.join(rootDir, "research_setting.json");

export function saveResearchSetting(setting: ResearchSetting): void {
  fs.writeFileSync(
    researchSettingPath,
    JSON.stringify(setting, undefined, 2),
    "utf8"
  );
}

export function loadResearchSetting(): ResearchSetting {
  if (!fs.existsSync(researchSettingPath)) {
    return defaultResearchSetting();
  }
  return {
    ...defaultResearchSetting(),
    ...JSON.parse(fs.readFileSync(researchSettingPath, "utf8")),
  };
}

const analysisSettingPath = path.join(rootDir, "analysis_setting.json");

export function saveAnalysisSetting(setting: AnalysisSetting): void {
  fs.writeFileSync(
    analysisSettingPath,
    JSON.stringify(setting, undefined, 2),
    "utf8"
  );
}

export function loadAnalysisSetting(): AnalysisSetting {
  if (!fs.existsSync(analysisSettingPath)) {
    return defaultAnalysisSetting();
  }
  return {
    ...defaultAnalysisSetting(),
    ...JSON.parse(fs.readFileSync(analysisSettingPath, "utf8")),
  };
}

const extensionSettingPath = path.join(rootDir, "extension_setting.json");

export function saveExtensionSetting(setting: USIEngineSettings): void {
  fs.writeFileSync(
    extensionSettingPath,
    JSON.stringify(setting, undefined, 2),
    "utf8"
  );
}

export function loadExtensionSetting(): ExtensionSettings {
  if (!fs.existsSync(extensionSettingPath)) {
    return defaultExtensionSettings();
  }
  return {
    ...defaultExtensionSettings(),
    ...JSON.parse(fs.readFileSync(extensionSettingPath, "utf8")),
  };
}
