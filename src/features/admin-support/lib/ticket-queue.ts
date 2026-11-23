import type { AdminSupportFilter } from "@/lib/admin/dashboard-links";
import type { AdminSupportNote, AdminSupportTicket } from "@/lib/admin/queries/support";
import type { SupportTicketStatus } from "@/lib/support/labels";

export const SUPPORT_FILTERS: readonly AdminSupportFilter[] = ["all", "open", "waiting", "resolved"];

/** Reads the filter from the address bar; anything unknown means "all". */
export function parseSupportFilter(value: string | null | undefined): AdminSupportFilter {
  return value === "open" || value === "waiting" || value === "resolved" ? value : "all";
}

export function countByStatus(tickets: readonly AdminSupportTicket[]): Record<AdminSupportFilter, number> {
  const counts: Record<AdminSupportFilter, number> = { all: tickets.length, open: 0, waiting: 0, resolved: 0 };
  for (const ticket of tickets) {
    if (ticket.status in counts) counts[ticket.status as Exclude<AdminSupportFilter, "all">] += 1;
  }
  return counts;
}

/** True when the ticket passes the status filter and the search text matches the organization, subject, people or any note. */
export function matchesTicket(ticket: AdminSupportTicket, filter: AdminSupportFilter, search: string): boolean {
  if (filter !== "all" && ticket.status !== filter) return false;
  const query = search.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    ticket.organizationName,
    ticket.organizationSlug,
    ticket.subject,
    ticket.createdByName ?? "",
    ticket.assignedToName ?? "",
    ...ticket.notes.map((note) => note.body),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

const RANK: Record<SupportTicketStatus, number> = { open: 0, waiting: 1, resolved: 2 };

/** Work first: open tickets, then waiting, then resolved; the most recently updated first within each. */
export function sortQueue(tickets: readonly AdminSupportTicket[]): AdminSupportTicket[] {
  return [...tickets].sort((a, b) => RANK[a.status] - RANK[b.status] || b.updatedAt.localeCompare(a.updatedAt));
}

/** The newest note the customer can see, or the newest note of any kind when there is none. */
export function latestNote(ticket: AdminSupportTicket): AdminSupportNote | null {
  const newest = (notes: readonly AdminSupportNote[]) => notes.reduce<AdminSupportNote | null>((best, n) => (!best || n.createdAt > best.createdAt ? n : best), null);
  return newest(ticket.notes.filter((note) => !note.isInternal)) ?? newest(ticket.notes);
}

/** Query string for the support page; defaults (all, no search, no selection) are left out. */
export function buildSupportQuery(state: { filter: AdminSupportFilter; q: string; ticket: string | null }): string {
  const params = new URLSearchParams();
  if (state.filter !== "all") params.set("filter", state.filter);
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.ticket) params.set("sak", state.ticket);
  return params.toString();
}
