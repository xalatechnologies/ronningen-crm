import type { Locale } from "@/i18n/config";
import { defaultLocale, normalizeLocale } from "@/i18n/config";
import { formatDate, formatDateTime } from "@/i18n/formatters";
import { formatAccommodationTimeLabel } from "@/lib/accommodation-time";

function parseDate(value: Date | string): Date | null {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Locale-aware datetime, e.g. "11. juni 2026 kl. 07:59" (nb) or "11 Jun 2026, 07:59" (en). */
export function formatAppDateTime(
  value: Date | string,
  locale: Locale = defaultLocale,
): string {
  const d = parseDate(value);
  if (!d) return "—";
  return formatDateTime(normalizeLocale(locale), d);
}

/** Date with optional time — date only when time is missing. */
export function formatAppDateFromParts(
  dateYmd: string,
  timeRaw?: string | null,
  locale: Locale = defaultLocale,
): string {
  const resolved = normalizeLocale(locale);
  const dateOnly = parseDate(`${dateYmd}T12:00:00`);
  if (!dateOnly) return "—";

  const time = formatAccommodationTimeLabel(timeRaw);
  if (!time) {
    return formatDate(resolved, dateOnly);
  }

  const withTime = parseDate(`${dateYmd}T${time}:00`);
  if (!withTime) {
    return formatDate(resolved, dateOnly);
  }

  return formatDateTime(resolved, withTime);
}
