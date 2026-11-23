import type { Locale } from "@/i18n/config";

const OSLO_TIME_ZONE = "Europe/Oslo";

const intlLocales: Record<Locale, string> = {
  nb: "nb-NO",
  en: "en-GB",
};

/** Timestamp in Europe/Oslo regardless of server/browser time zone. Never throws. */
export function formatAuditTimestamp(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OSLO_TIME_ZONE,
  }).format(d);
}

/** Hours and minutes in Europe/Oslo, for the time next to an entry. Never throws. */
export function formatAuditClock(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocales[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OSLO_TIME_ZONE,
  }).format(d);
}

/** Long date heading such as "14. november 2026" in Europe/Oslo. Never throws. */
export function formatAuditDay(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: OSLO_TIME_ZONE,
  }).format(d);
}

/** Calendar day (YYYY-MM-DD) of an instant in Europe/Oslo, so grouping ignores server time zone. */
export function auditDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  // The sv-SE locale prints dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: OSLO_TIME_ZONE }).format(d);
}
