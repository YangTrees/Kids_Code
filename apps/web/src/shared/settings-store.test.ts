import { beforeEach, describe, expect, it } from "vitest";
import { translate, type TranslationKey } from "./i18n";
import { useSettingsStore } from "./settings-store";

const zhKeys: TranslationKey[] = [
  "brand.title",
  "home.nav.learn",
  "home.hero.titleLead",
  "editor.save.saved",
  "editor.status.RUNNING",
  "help.title",
  "parent.title",
];

describe("i18n", () => {
  it("serves Chinese as the primary language", () => {
    expect(translate("zh-CN", "brand.title")).toBe("栗奇编程乐园");
  });

  it("provides an English translation for every Chinese key", () => {
    for (const key of zhKeys) {
      const english = translate("en", key);
      expect(english, key).toBeTruthy();
      expect(english, key).not.toBe(translate("zh-CN", key));
    }
  });

  it("falls back to Chinese for unknown locales", () => {
    expect(translate("ja-JP", "brand.title")).toBe("栗奇编程乐园");
  });
});

describe("settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetSettings();
  });

  it("starts from child-friendly defaults", () => {
    const state = useSettingsStore.getState();
    expect(state.locale).toBe("zh-CN");
    expect(state.allowRecording).toBe(true);
    expect(state.allowUploads).toBe(true);
    expect(state.reduceMotion).toBe(false);
  });

  it("persists parent controls to local storage", () => {
    useSettingsStore.getState().setAllowRecording(false);
    useSettingsStore.getState().setVolume(0.4);

    expect(useSettingsStore.getState().allowRecording).toBe(false);
    const stored = JSON.parse(localStorage.getItem("kids-code:settings")!);
    expect(stored.allowRecording).toBe(false);
    expect(stored.volume).toBeCloseTo(0.4);
  });

  it("clamps nothing but keeps every field typed after a reset", () => {
    useSettingsStore.getState().setAllowUploads(false);
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().allowUploads).toBe(true);
  });
});
