import { describe, expect, it } from "vitest";

import { BODY_MAX, SUBJECT_MAX, validateTicketText } from "@/features/support/lib/ticket-input";
import {
  countTickets,
  filterTickets,
  lastMessage,
  previewText,
  sortTickets,
} from "@/features/support/lib/ticket-view";
import type { OrgSupportMessage, OrgSupportTicket } from "@/lib/support/types";

const NOW = new Date("2026-11-23T12:00:00Z");

const msg = (id: string, createdAt: string, extra: Partial<OrgSupportMessage> = {}): OrgSupportMessage => ({
  id,
  body: "hei",
  authorName: null,
  createdAt,
  isFromPlatform: false,
  ...extra,
});

const ticket = (id: string, status: OrgSupportTicket["status"], updatedAt: string, messages: OrgSupportMessage[] = []): OrgSupportTicket => ({
  id,
  subject: id,
  category: "other",
  status,
  messages,
  createdAt: updatedAt,
  updatedAt,
});

describe("validateTicketText", () => {
  it("accepts normal text and ignores surrounding blank space", () => {
    expect(validateTicketText({ subject: "  Hjelp  ", body: " Jeg trenger hjelp " })).toBeNull();
  });

  it("refuses too short subject or body", () => {
    expect(validateTicketText({ subject: "ab", body: "abc" })).toBe("subject_min");
    expect(validateTicketText({ subject: "abc", body: "  a " })).toBe("body_min");
  });

  it("refuses too long subject or body", () => {
    expect(validateTicketText({ subject: "a".repeat(SUBJECT_MAX + 1), body: "abc" })).toBe("subject_max");
    expect(validateTicketText({ subject: "abc", body: "a".repeat(BODY_MAX + 1) })).toBe("body_max");
    expect(validateTicketText({ subject: "a".repeat(SUBJECT_MAX), body: "a".repeat(BODY_MAX) })).toBeNull();
  });

  it("checks only the body for a reply", () => {
    expect(validateTicketText({ body: "ok!" })).toBeNull();
    expect(validateTicketText({ body: "ok" })).toBe("body_min");
  });
});

describe("tickets", () => {
  const tickets = [
    ticket("a", "resolved", "2026-11-20T10:00:00Z"),
    ticket("b", "open", "2026-11-21T10:00:00Z"),
    ticket("c", "waiting", "2026-11-19T10:00:00Z"),
    ticket("d", "open", "2026-11-22T10:00:00Z"),
  ];

  it("counts per filter and filters", () => {
    expect(countTickets(tickets)).toEqual({ all: 4, open: 2, waiting: 1, resolved: 1 });
    expect(filterTickets(tickets, "open").map((t) => t.id)).toEqual(["b", "d"]);
    expect(filterTickets(tickets, "all")).toHaveLength(4);
  });

  it("puts tickets waiting for the customer first, then open, then resolved, newest first", () => {
    expect(sortTickets(tickets).map((t) => t.id)).toEqual(["c", "d", "b", "a"]);
  });

  it("finds the newest message", () => {
    const t = ticket("x", "open", "2026-11-22T10:00:00Z", [msg("1", "2026-11-20T10:00:00Z"), msg("2", "2026-11-22T09:00:00Z"), msg("3", "2026-11-21T10:00:00Z")]);
    expect(lastMessage(t)?.id).toBe("2");
    expect(lastMessage(ticket("y", "open", "2026-11-22T10:00:00Z"))).toBeNull();
  });
});

describe("previewText", () => {
  it("flattens line breaks and cuts long text", () => {
    expect(previewText("a\n\nb   c")).toBe("a b c");
    const cut = previewText("x".repeat(200), 20);
    expect(cut).toHaveLength(20);
    expect(cut.endsWith("…")).toBe(true);
  });
});
