import { describe, expect, it } from "vitest";

import {
  buildSupportQuery,
  countByStatus,
  latestNote,
  matchesTicket,
  parseSupportFilter,
  sortQueue,
} from "@/features/admin-support/lib/ticket-queue";
import type { AdminSupportNote, AdminSupportTicket } from "@/lib/admin/queries/support";

const note = (id: string, createdAt: string, extra: Partial<AdminSupportNote> = {}): AdminSupportNote => ({
  id,
  body: `tekst ${id}`,
  authorName: null,
  authorIsPlatformAdmin: false,
  isInternal: false,
  createdAt,
  ...extra,
});

const ticket = (id: string, over: Partial<AdminSupportTicket> = {}): AdminSupportTicket => ({
  id,
  organizationId: "org-1",
  organizationName: "Rønningen Selskapslokale",
  organizationSlug: "event-manager",
  status: "open",
  category: "other",
  subject: `Emne ${id}`,
  noteCount: 0,
  notes: [],
  assignedToName: null,
  createdByName: null,
  ticketSource: "tenant",
  createdAt: "2026-11-20T10:00:00Z",
  updatedAt: "2026-11-20T10:00:00Z",
  ...over,
});

describe("parseSupportFilter", () => {
  it("accepts the three statuses and treats anything else as all", () => {
    expect(parseSupportFilter("open")).toBe("open");
    expect(parseSupportFilter("waiting")).toBe("waiting");
    expect(parseSupportFilter("resolved")).toBe("resolved");
    expect(parseSupportFilter("x")).toBe("all");
    expect(parseSupportFilter(null)).toBe("all");
  });
});

describe("countByStatus", () => {
  it("counts all and each status", () => {
    const counts = countByStatus([ticket("a"), ticket("b", { status: "waiting" }), ticket("c", { status: "resolved" }), ticket("d", { status: "resolved" })]);
    expect(counts).toEqual({ all: 4, open: 1, waiting: 1, resolved: 2 });
  });
});

describe("matchesTicket", () => {
  const t = ticket("a", {
    subject: "Faktura feil",
    createdByName: "Eva Eier",
    assignedToName: "Per Plattform",
    notes: [note("1", "2026-11-20T10:00:00Z", { body: "Betalingen feilet i går" })],
  });

  it("filters by status", () => {
    expect(matchesTicket(t, "open", "")).toBe(true);
    expect(matchesTicket(t, "waiting", "")).toBe(false);
    expect(matchesTicket(t, "all", "")).toBe(true);
  });

  it("searches organization, slug, subject, people and the text of notes, ignoring case and spaces around", () => {
    for (const q of ["rønningen", "EVENT-MANAGER", " faktura ", "eva", "per plattform", "betalingen feilet"]) {
      expect(matchesTicket(t, "all", q), q).toBe(true);
    }
    expect(matchesTicket(t, "all", "oslo")).toBe(false);
  });

  it("needs both the status and the text to match", () => {
    expect(matchesTicket(t, "waiting", "faktura")).toBe(false);
  });
});

describe("sortQueue", () => {
  it("puts open first, then waiting, then resolved, newest first within each", () => {
    const sorted = sortQueue([
      ticket("res", { status: "resolved", updatedAt: "2026-11-23T10:00:00Z" }),
      ticket("wait", { status: "waiting", updatedAt: "2026-11-22T10:00:00Z" }),
      ticket("old", { updatedAt: "2026-11-01T10:00:00Z" }),
      ticket("new", { updatedAt: "2026-11-21T10:00:00Z" }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["new", "old", "wait", "res"]);
  });

  it("does not change the list it is given", () => {
    const list = [ticket("b", { status: "resolved" }), ticket("a")];
    sortQueue(list);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("latestNote", () => {
  it("prefers the newest note the customer can see", () => {
    const t = ticket("a", {
      notes: [note("1", "2026-11-20T10:00:00Z"), note("2", "2026-11-22T10:00:00Z"), note("3", "2026-11-23T10:00:00Z", { isInternal: true })],
    });
    expect(latestNote(t)?.id).toBe("2");
  });

  it("falls back to an internal note, or null when there are no notes", () => {
    expect(latestNote(ticket("a", { notes: [note("1", "2026-11-20T10:00:00Z", { isInternal: true })] }))?.id).toBe("1");
    expect(latestNote(ticket("a"))).toBeNull();
  });
});

describe("buildSupportQuery", () => {
  it("leaves out defaults", () => {
    expect(buildSupportQuery({ filter: "all", q: "  ", ticket: null })).toBe("");
  });

  it("keeps filter, search and selected ticket", () => {
    expect(buildSupportQuery({ filter: "open", q: " faktura ", ticket: "t1" })).toBe("filter=open&q=faktura&sak=t1");
  });
});
