"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import english from "@/lib/i18n/en.json";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeDirection,
  LOCALES,
  LOCALE_STORAGE_KEY,
  matchLocale,
  type Locale,
} from "@/lib/i18n/config";
import { localeLoaders } from "@/lib/i18n/loaders";

export type TranslationKey = keyof typeof english;
type Dictionary = Record<TranslationKey, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [dictionary, setDictionary] = useState<Dictionary>(english);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const detected = stored && isLocale(stored) ? stored : matchLocale(navigator.languages);
    setLocaleState(detected);
  }, []);

  useEffect(() => {
    let active = true;
    const loader = localeLoaders[locale] || localeLoaders.en;
    loader().then((module) => {
      if (active) setDictionary({ ...english, ...module.default } as Dictionary);
    });
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    return () => { active = false; };
  }, [locale]);

  const t = useCallback((key: TranslationKey) => dictionary[key] || english[key], [dictionary]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export { LOCALES, type Locale } from "@/lib/i18n/config";
