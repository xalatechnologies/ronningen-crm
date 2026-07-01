import type { Locale } from "@/i18n/config";
import { format as dateFnsFormat } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";

export const dateFnsLocales = {
  nb,
  en: enGB,
} as const;

export function getDateFnsLocale(locale: Locale) {
  return dateFnsLocales[locale];
}

const intlLocales: Record<Locale, string> = {
  nb: "nb-NO",
  en: "en-GB",
};

export function formatDate(
  locale: Locale,
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

export function formatDateTime(locale: Locale, date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "nb") {
    return dateFnsFormat(d, "d. MMM yyyy 'kl.' HH:mm", {
      locale: dateFnsLocales.nb,
    });
  }
  return dateFnsFormat(d, "d MMM yyyy, HH:mm", { locale: dateFnsLocales.en });
}

export function formatCurrency(locale: Locale, amount: number) {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocales[locale]).format(value);
}

export function formatPercent(locale: Locale, value: number) {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function createFormatters(locale: Locale) {
  return {
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      formatDate(locale, date, options),
    formatDateTime: (date: Date | string) => formatDateTime(locale, date),
    formatCurrency: (amount: number) => formatCurrency(locale, amount),
    formatNumber: (value: number) => formatNumber(locale, value),
    formatPercent: (value: number) => formatPercent(locale, value),
  };
}
