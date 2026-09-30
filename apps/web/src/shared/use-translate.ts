import { useCallback } from "react";
import { translate, type Dictionary, type TranslationKey } from "./i18n";
import { useSettingsStore } from "./settings-store";

/** 取得当前语言的翻译函数。 */
export function useTranslate(): (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string {
  const locale = useSettingsStore((state) => state.locale);
  return useCallback(
    (key, values) => {
      const text = translate(locale, key);
      if (!values) return text;
      return text.replace(/\{(\w+)\}/g, (match, token: string) =>
        token in values ? String(values[token]) : match,
      );
    },
    [locale],
  );
}

export type { Dictionary, TranslationKey };
