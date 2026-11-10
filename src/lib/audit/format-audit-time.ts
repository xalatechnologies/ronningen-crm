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
