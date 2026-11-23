import type { InboxRow } from "@/lib/portal/inbox-rules";

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** Whole days from `todayIso` to the event day (yyyy-mm-dd, a time part is ignored). Negative for past events. */
export function daysUntil(eventIso: string, todayIso: string): number {
  return Math.round((utcDay(eventIso) - utcDay(todayIso)) / DAY_MS);
}

export type Countdown = { kind: "today" } | { kind: "tomorrow" } | { kind: "future"; days: number } | { kind: "past"; days: number };

export function countdownKind(days: number): Countdown {
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  return days > 1 ? { kind: "future", days } : { kind: "past", days: Math.abs(days) };
}

export type InboxSummary = {
  /** Customers with something waiting for the venue's reply. */
  waitingCustomers: number;
  /** Messages, wishes and shared plans waiting, added up. */
  waitingItems: number;
  /** Portals the customer has opened. */
  active: number;
  /** Invitations that are still pending or have expired. */
  followUp: number;
  /** The nearest event that has not happened yet. */
  next: { row: InboxRow; days: number } | null;
};

export function inboxSummary(rows: readonly InboxRow[], todayIso: string): InboxSummary {
  let next: InboxSummary["next"] = null;
  for (const row of rows) {
    if (!row.eventDate) continue;
    const days = daysUntil(row.eventDate, todayIso);
    if (days >= 0 && (next === null || days < next.days)) next = { row, days };
  }
  return {
    waitingCustomers: rows.filter((r) => r.attention > 0).length,
    waitingItems: rows.reduce((sum, r) => sum + r.attention, 0),
    active: rows.filter((r) => r.state === "active").length,
    followUp: rows.filter((r) => r.state !== "active").length,
    next,
  };
}

/** Free-text search over customer name, booking reference and event type. */
export function searchInbox(rows: readonly InboxRow[], query: string): InboxRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => `${r.customerName} ${r.reference} ${r.eventType ?? ""}`.toLowerCase().includes(q));
}
