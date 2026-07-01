export const supportedLocales = ["nb", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "nb";

export const localeCookieName = "event-manager-locale";

export const localeLocalStorageKey = "event-manager-locale";

export function isSupportedLocale(value: unknown): value is Locale {
  return value === "nb" || value === "en";
}

export function normalizeLocale(value: unknown): Locale {
  return isSupportedLocale(value) ? value : defaultLocale;
}

export function getLocaleLabel(locale: Locale): string {
  return locale === "nb" ? "Norsk" : "English";
}

export function applyLocaleToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

/** @deprecated Use Locale from @/i18n/config */
export type AppLocale = Locale;
