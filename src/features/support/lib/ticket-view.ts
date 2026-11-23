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
