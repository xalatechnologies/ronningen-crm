import { auditDayKey } from "@/lib/audit/format-audit-time";

export type DayGroup<T> = {
  /** YYYY-MM-DD in Europe/Oslo. */
  dayKey: string;
  /** How to title the group: relative for today and yesterday, otherwise the date of `isoOfFirst`. */
  label: "today" | "yesterday" | "date";
  isoOfFirst: string;
  items: T[];
};

/** The calendar day before a YYYY-MM-DD key. Pure date arithmetic, so daylight-saving days cannot skew it. */
function previousDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! - 1)).toISOString().slice(0, 10);
}

/** Groups entries (already newest first) by Oslo calendar day, keeping their order. */
export function groupByDay<T extends { createdAtIso: string }>(items: T[], now: Date): Array<DayGroup<T>> {
  const today = auditDayKey(now.toISOString());
  const yesterday = previousDayKey(today);
  const groups: Array<DayGroup<T>> = [];
  for (const item of items) {
    const dayKey = auditDayKey(item.createdAtIso);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.items.push(item);
      continue;
    }
    groups.push({
      dayKey,
      label: dayKey === today ? "today" : dayKey === yesterday ? "yesterday" : "date",
      isoOfFirst: item.createdAtIso,
      items: [item],
    });
  }
  return groups;
}
