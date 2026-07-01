"use client";

import {
  applyLocaleToDocument,
  defaultLocale,
  localeCookieName,
  normalizeLocale,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createFormatters } from "@/i18n/formatters";
import { createTranslator } from "@/i18n/translate";
import type { TranslationContext, TranslationKey, TranslationParams } from "@/i18n/types";
import { useAppStore } from "@/store/app-store";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

const I18nContext = createContext<TranslationContext | null>(null);

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: Locale;
};

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: I18nProviderProps) {
  const router = useRouter();
  const locale = useAppStore((s) => s.locale);
  const setLocaleStore = useAppStore((s) => s.setLocale);

  useEffect(() => {
    const stored = useAppStore.getState().locale;
    if (!stored || stored === initialLocale) {
      setLocaleStore(initialLocale);
    }
    applyLocaleToDocument(useAppStore.getState().locale ?? initialLocale);
    const unsub = useAppStore.persist.onFinishHydration(() => {
      const hydrated = normalizeLocale(useAppStore.getState().locale);
      applyLocaleToDocument(hydrated);
      writeLocaleCookie(hydrated);
    });
    return unsub;
  }, [initialLocale, setLocaleStore]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleStore(next);
      applyLocaleToDocument(next);
      writeLocaleCookie(next);
      router.refresh();
    },
    [router, setLocaleStore],
  );

  const value = useMemo<TranslationContext>(() => {
    const resolved = normalizeLocale(locale);
    const dictionary = getDictionary(resolved);
    const t = (key: TranslationKey, params?: TranslationParams) =>
      createTranslator(dictionary)(key, params);
    return {
      locale: resolved,
      setLocale,
      t,
      ...createFormatters(resolved),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): TranslationContext {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export function useLocale() {
  const { locale, setLocale } = useTranslation();
  return { locale, setLocale };
}
