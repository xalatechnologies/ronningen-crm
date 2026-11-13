import { describe, expect, it } from "vitest";

import { filterInbox, inboxAttention, inboxCounts, inboxTab, parseInboxFilter, sortInbox, type InboxRow } from "./inbox-rules";

const row = (over: Partial<InboxRow>): InboxRow => {
  const base = { bookingId: "b", customerName: "K", reference: "R", eventDate: null, eventType: null, state: "active" as const, unread: 0, wishesWaiting: 0, planWaiting: false, tab: "messages" as const };
  const r = { ...base, ...over };
  return { ...r, attention: inboxAttention(r), tab: inboxTab(r) };
};

describe("portal inbox", () => {
  it("counts what needs a reply and opens the right tab", () => {
    expect(inboxAttention({ unread: 2, wishesWaiting: 1, planWaiting: true })).toBe(4);
    expect(inboxTab({ unread: 1, wishesWaiting: 3 })).toBe("messages");
    expect(inboxTab({ unread: 0, wishesWaiting: 3 })).toBe("wishes");
    expect(inboxTab({ unread: 0, wishesWaiting: 0 })).toBe("schedule");
  });
  it("sorts replies first, then nearest date, undated last", () => {
    const rows = [
      row({ bookingId: "late", eventDate: "2027-09-01" }),
      row({ bookingId: "none" }),
      row({ bookingId: "reply-late", eventDate: "2027-12-01", unread: 1 }),
      row({ bookingId: "reply-soon", eventDate: "2027-01-01", wishesWaiting: 1 }),
      row({ bookingId: "soon", eventDate: "2027-02-01" }),
    ];
    expect(sortInbox(rows).map((r) => r.bookingId)).toEqual(["reply-soon", "reply-late", "soon", "late", "none"]);
  });
  it("filters and counts", () => {
    const rows = [row({ unread: 1 }), row({}), row({ state: "invited" }), row({ state: "expired" })];
    expect(inboxCounts(rows)).toEqual({ attention: 1, active: 2, invited: 2, all: 4 });
    expect(filterInbox(rows, "invited")).toHaveLength(2);
  });
  it("falls back to attention for an unknown filter", () => {
    expect(parseInboxFilter("x")).toBe("attention");
    expect(parseInboxFilter("all")).toBe("all");
  });
});
