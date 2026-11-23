/** Time helpers for conversations: relative times ("3 hours ago") and day dividers in Oslo time. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then a plain date after a week.
 * `now` is a parameter so the result can be tested and does not change between server and browser renders.
 */
export function formatRelativeTime(iso: string, now: Date, locale: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diff = now.getTime() - then.getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 0 || diff < MINUTE) return rtf.format(0, "second");
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), "hour");
  if (diff < 7 * DAY) return rtf.format(-Math.floor(diff / DAY), "day");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: then.getFullYear() === now.getFullYear() ? undefined : "numeric", timeZone: "Europe/Oslo" }).format(then);
}

/** Calendar day (YYYY-MM-DD) in Europe/Oslo, so grouping does not depend on the viewer's time zone. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "invalid" : new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(date);
}

function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - 1)).toISOString().slice(0, 10);
}

export type DayGroup<T> = { dayKey: string; label: "today" | "yesterday" | "date"; isoOfFirst: string; items: T[] };

/** Items (each with a `createdAt`) oldest first, grouped by Oslo calendar day, for the day dividers in a conversation. */
export function groupByDay<T extends { createdAt: string }>(items: readonly T[], now: Date): Array<DayGroup<T>> {
  const today = dayKey(now.toISOString());
  const yesterday = previousDay(today);
  const groups: Array<DayGroup<T>> = [];
  for (const item of [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = dayKey(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === key) {
      last.items.push(item);
    } else {
      groups.push({ dayKey: key, label: key === today ? "today" : key === yesterday ? "yesterday" : "date", isoOfFirst: item.createdAt, items: [item] });
    }
  }
  return groups;
}
