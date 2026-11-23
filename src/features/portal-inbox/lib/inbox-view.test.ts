import { describe, expect, it } from "vitest";

import { countdownKind, daysUntil, inboxSummary, searchInbox } from "@/features/portal-inbox/lib/inbox-view";
import type { InboxRow } from "@/lib/portal/inbox-rules";

const row = (over: Partial<InboxRow>): InboxRow => ({
  bookingId: "b1",
  customerName: "Kari Nordmann",
  reference: "RN-2026-001",
  eventDate: "2026-12-10",
  eventType: "Bryllup",
  state: "active",
  unread: 0,
  wishesWaiting: 0,
  planWaiting: false,
  attention: 0,
  tab: "messages",
  ...over,
});

describe("daysUntil", () => {
  it("counts whole days between today and the event, negative for past events", () => {
    expect(daysUntil("2026-12-10", "2026-11-23")).toBe(17);
    expect(daysUntil("2026-11-23", "2026-11-23")).toBe(0);
    expect(daysUntil("2026-11-22", "2026-11-23")).toBe(-1);
  });

  it("works across month and year boundaries and ignores a time part", () => {
    expect(daysUntil("2027-01-02", "2026-12-30")).toBe(3);
    expect(daysUntil("2026-12-10T18:00:00+01:00", "2026-12-09")).toBe(1);
  });
});

describe("countdownKind", () => {
  it("names today, tomorrow, coming days and past days", () => {
    expect(countdownKind(0)).toEqual({ kind: "today" });
    expect(countdownKind(1)).toEqual({ kind: "tomorrow" });
    expect(countdownKind(12)).toEqual({ kind: "future", days: 12 });
    expect(countdownKind(-3)).toEqual({ kind: "past", days: 3 });
  });
});

describe("inboxSummary", () => {
  const rows = [
    row({ bookingId: "a", attention: 3, unread: 2, wishesWaiting: 1, eventDate: "2026-12-10" }),
    row({ bookingId: "b", attention: 1, planWaiting: true, eventDate: "2026-12-01" }),
    row({ bookingId: "c", state: "invited", eventDate: "2027-02-01" }),
    row({ bookingId: "d", state: "expired", eventDate: "2026-11-01" }),
    row({ bookingId: "e", eventDate: null }),
  ];

  it("counts customers waiting, items waiting, active portals and invitations that need follow-up", () => {
    const s = inboxSummary(rows, "2026-11-23");
    expect(s).toMatchObject({ waitingCustomers: 2, waitingItems: 4, active: 3, followUp: 2 });
  });

  it("finds the nearest upcoming event, ignoring past and undated ones", () => {
    const s = inboxSummary(rows, "2026-11-23");
    expect(s.next?.row.bookingId).toBe("b");
    expect(s.next?.days).toBe(8);
  });

  it("has no next event when nothing is coming up", () => {
    expect(inboxSummary([row({ eventDate: "2026-01-01" }), row({ eventDate: null })], "2026-11-23").next).toBeNull();
    expect(inboxSummary([], "2026-11-23")).toMatchObject({ waitingCustomers: 0, active: 0, followUp: 0, next: null });
  });
});

describe("searchInbox", () => {
  const rows = [row({ bookingId: "a" }), row({ bookingId: "b", customerName: "Per Hansen", reference: "RN-2026-002", eventType: "Konfirmasjon" })];

  it("matches name, reference and event type, ignoring case and extra spaces", () => {
    expect(searchInbox(rows, "  per ").map((r) => r.bookingId)).toEqual(["b"]);
    expect(searchInbox(rows, "rn-2026-001").map((r) => r.bookingId)).toEqual(["a"]);
    expect(searchInbox(rows, "KONFIRM").map((r) => r.bookingId)).toEqual(["b"]);
  });

  it("returns everything for an empty search and nothing for no match", () => {
    expect(searchInbox(rows, "   ")).toHaveLength(2);
    expect(searchInbox(rows, "zzz")).toEqual([]);
  });
});
