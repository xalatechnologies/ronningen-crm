import { formatAccommodationTimeLabel } from "@/lib/accommodation-time";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";

const APP_DATETIME_PATTERN = "d. MMM yyyy 'kl.' HH:mm";
const APP_DATE_PATTERN = "d. MMM yyyy";

function parseDate(value: Date | string): Date | null {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** "11. juni 2026 kl. 07:59" */
export function formatAppDateTime(value: Date | string): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, APP_DATETIME_PATTERN, { locale: nb });
}

/** "10. juni 2026 kl. 12:00" — eller bare dato hvis klokkeslett mangler. */
export function formatAppDateFromParts(
  dateYmd: string,
  timeRaw?: string | null,
): string {
  const dateOnly = parseDate(`${dateYmd}T12:00:00`);
  if (!dateOnly) return "—";

  const time = formatAccommodationTimeLabel(timeRaw);
  if (!time) {
    return format(dateOnly, APP_DATE_PATTERN, { locale: nb });
  }

  const withTime = parseDate(`${dateYmd}T${time}:00`);
  if (!withTime) {
    return format(dateOnly, APP_DATE_PATTERN, { locale: nb });
  }

  return format(withTime, APP_DATETIME_PATTERN, { locale: nb });
}
