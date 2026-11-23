import type { SupportTicketStatus } from "@/lib/support/labels";
import type { OrgSupportMessage, OrgSupportTicket } from "@/lib/support/types";

export const TICKET_FILTERS = ["all", "open", "waiting", "resolved"] as const;
export type TicketFilter = (typeof TICKET_FILTERS)[number];

export function filterTickets(tickets: readonly OrgSupportTicket[], filter: TicketFilter): OrgSupportTicket[] {
  return filter === "all" ? [...tickets] : tickets.filter((ticket) => ticket.status === filter);
}

/** How many tickets each filter would show. */
export function countTickets(tickets: readonly OrgSupportTicket[]): Record<TicketFilter, number> {
  const counts: Record<TicketFilter, number> = { all: tickets.length, open: 0, waiting: 0, resolved: 0 };
  for (const ticket of tickets) counts[ticket.status] += 1;
  return counts;
}

/** The newest message of a ticket, or null when it has none. */
export function lastMessage(ticket: OrgSupportTicket): OrgSupportMessage | null {
  let latest: OrgSupportMessage | null = null;
  for (const message of ticket.messages) {
    if (!latest || message.createdAt > latest.createdAt) latest = message;
  }
  return latest;
}

/** One line of a message for the list: line breaks become spaces and long text is cut with an ellipsis. */
export function previewText(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Tickets that need the customer to act (waiting for the customer's answer) come first, then newest first. */
export function sortTickets(tickets: readonly OrgSupportTicket[]): OrgSupportTicket[] {
  const rank: Record<SupportTicketStatus, number> = { waiting: 0, open: 1, resolved: 2 };
  return [...tickets].sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt));
}

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

export type MessageDay = { dayKey: string; label: "today" | "yesterday" | "date"; isoOfFirst: string; messages: OrgSupportMessage[] };

/** Messages oldest first, grouped by Oslo calendar day, for the day dividers in a conversation. */
export function groupMessagesByDay(messages: readonly OrgSupportMessage[], now: Date): MessageDay[] {
  const today = dayKey(now.toISOString());
  const yesterday = previousDay(today);
  const groups: MessageDay[] = [];
  for (const message of [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = dayKey(message.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === key) {
      last.messages.push(message);
    } else {
      groups.push({ dayKey: key, label: key === today ? "today" : key === yesterday ? "yesterday" : "date", isoOfFirst: message.createdAt, messages: [message] });
    }
  }
  return groups;
}
