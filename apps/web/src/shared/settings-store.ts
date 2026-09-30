/**
 * 全站偏好与家长控制（设计说明书第 16、17 章）。
 *
 * 本地优先版本：设置只存在本机 localStorage，不上传任何数据。
 */
import { create } from "zustand";

export type AppLocale = "zh-CN" | "en";

export interface AppSettings {
  locale: AppLocale;
  /** 0–1，作用于作品里的音效与录音播放 */
  volume: number;
  /** 减少动画：关闭庆祝动效与补间装饰，保留必要反馈 */
  reduceMotion: boolean;
  /** 家长控制：是否允许录音 */
  allowRecording: boolean;
  /** 家长控制：是否允许上传图片与音频 */
  allowUploads: boolean;
  /** 引导是否已完成 */
  tutorialDone: boolean;
}

interface SettingsState extends AppSettings {
  setLocale: (locale: AppLocale) => void;
  setVolume: (volume: number) => void;
  setReduceMotion: (value: boolean) => void;
  setAllowRecording: (value: boolean) => void;
  setAllowUploads: (value: boolean) => void;
  setTutorialDone: (value: boolean) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = "kids-code:settings";

const DEFAULT_SETTINGS: AppSettings = {
  locale: "zh-CN",
  volume: 0.8,
  reduceMotion: false,
  allowRecording: true,
  allowUploads: true,
  tutorialDone: false,
};

function readStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      locale:
        parsed.locale === "en" || parsed.locale === "zh-CN"
          ? parsed.locale
          : DEFAULT_SETTINGS.locale,
      volume:
        typeof parsed.volume === "number" &&
        Number.isFinite(parsed.volume) &&
        parsed.volume >= 0 &&
        parsed.volume <= 1
          ? parsed.volume
          : DEFAULT_SETTINGS.volume,
      reduceMotion:
        typeof parsed.reduceMotion === "boolean"
          ? parsed.reduceMotion
          : DEFAULT_SETTINGS.reduceMotion,
      allowRecording:
        typeof parsed.allowRecording === "boolean"
          ? parsed.allowRecording
          : DEFAULT_SETTINGS.allowRecording,
      allowUploads:
        typeof parsed.allowUploads === "boolean"
          ? parsed.allowUploads
          : DEFAULT_SETTINGS.allowUploads,
      tutorialDone:
        typeof parsed.tutorialDone === "boolean"
          ? parsed.tutorialDone
          : DEFAULT_SETTINGS.tutorialDone,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式下写入失败时忽略，设置仅在当前会话生效。
  }
}

const initial = readStoredSettings();

export const useSettingsStore = create<SettingsState>((set, get) => {
  const patch = (changes: Partial<AppSettings>) => {
    const next = { ...pickSettings(get()), ...changes };
    writeStoredSettings(next);
    set(changes);
  };
  return {
    ...initial,
    setLocale: (locale) => patch({ locale }),
    setVolume: (volume) => patch({ volume }),
    setReduceMotion: (reduceMotion) => patch({ reduceMotion }),
    setAllowRecording: (allowRecording) => patch({ allowRecording }),
    setAllowUploads: (allowUploads) => patch({ allowUploads }),
    setTutorialDone: (tutorialDone) => patch({ tutorialDone }),
    resetSettings: () => {
      writeStoredSettings(DEFAULT_SETTINGS);
      set({ ...DEFAULT_SETTINGS });
    },
  };
});

function pickSettings(state: AppSettings): AppSettings {
  return {
    locale: state.locale,
    volume: state.volume,
    reduceMotion: state.reduceMotion,
    allowRecording: state.allowRecording,
    allowUploads: state.allowUploads,
    tutorialDone: state.tutorialDone,
  };
}
