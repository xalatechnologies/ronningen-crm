export type InboxFilter = "attention" | "active" | "invited" | "all";

export type InboxRow = {
  bookingId: string;
  customerName: string;
  reference: string;
  eventDate: string | null;
  eventType: string | null;
  state: "active" | "invited" | "expired";
  unread: number;
  wishesWaiting: number;
  planWaiting: boolean;
  /** What needs the venue's reply: drives sorting, the badge and which tab the row opens. */
  attention: number;
  tab: "messages" | "wishes" | "schedule";
};

export const INBOX_FILTERS: readonly InboxFilter[] = ["attention", "active", "invited", "all"];

export function parseInboxFilter(raw: string | undefined): InboxFilter {
  return INBOX_FILTERS.find((f) => f === raw) ?? "attention";
}

export function inboxAttention(r: { unread: number; wishesWaiting: number; planWaiting: boolean }): number {
  return r.unread + r.wishesWaiting + (r.planWaiting ? 1 : 0);
}

/** First thing worth opening: messages, then wishes, then the shared plan. */
export function inboxTab(r: { unread: number; wishesWaiting: number }): InboxRow["tab"] {
  return r.unread > 0 ? "messages" : r.wishesWaiting > 0 ? "wishes" : "schedule";
}

/** Rows that need a reply first, then the nearest event date; undated events last. */
export function sortInbox(rows: readonly InboxRow[]): InboxRow[] {
  return [...rows].sort((a, b) => {
    if ((b.attention > 0) !== (a.attention > 0)) return b.attention > 0 ? 1 : -1;
    if (a.eventDate && b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    return a.eventDate ? -1 : b.eventDate ? 1 : 0;
  });
}

export function filterInbox(rows: readonly InboxRow[], filter: InboxFilter): InboxRow[] {
  switch (filter) {
    case "attention":
      return rows.filter((r) => r.attention > 0);
    case "active":
      return rows.filter((r) => r.state === "active");
    case "invited":
      return rows.filter((r) => r.state !== "active");
    default:
      return [...rows];
  }
}

export function inboxCounts(rows: readonly InboxRow[]): Record<InboxFilter, number> {
  return {
    attention: filterInbox(rows, "attention").length,
    active: filterInbox(rows, "active").length,
    invited: filterInbox(rows, "invited").length,
    all: rows.length,
  };
}
