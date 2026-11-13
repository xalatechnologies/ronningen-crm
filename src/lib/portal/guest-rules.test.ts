import { describe, expect, it } from "vitest";

import {
  guestInputSchema,
  MAX_GUESTS,
  parseGuestPaste,
  parseSummary,
  summarizeGuests,
  type GuestRow,
} from "./guest-rules";

const g = (over: Partial<GuestRow>): GuestRow => ({
  id: "x",
  name: "Gjest",
  email: null,
  phone: null,
  groupLabel: null,
  maxParty: 2,
  status: "not_sent",
  partySize: 1,
  diet: [],
  respondedAt: null,
  lastSentAt: null,
  optedOut: false,
  deliveryIssue: null,
  ...over,
});

describe("guestInputSchema", () => {
  it("normalizes e-mail to lowercase and blanks to null", () => {
    const r = guestInputSchema.parse({ name: " Kari Nordmann ", email: " KARI@Example.COM ", phone: " ", groupLabel: "Familie", maxParty: 2 });
    expect(r).toMatchObject({ name: "Kari Nordmann", email: "kari@example.com", phone: null, groupLabel: "Familie", maxParty: 2 });
    expect(guestInputSchema.parse({ name: "Ola", email: "" }).email).toBeNull();
  });
  it("rejects bad input", () => {
    expect(guestInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(guestInputSchema.safeParse({ name: "Ola", email: "not-an-email" }).success).toBe(false);
    expect(guestInputSchema.safeParse({ name: "Ola", maxParty: 0 }).success).toBe(false);
    expect(guestInputSchema.safeParse({ name: "Ola", maxParty: 11 }).success).toBe(false);
  });
});

describe("parseGuestPaste", () => {
  it("parses comma, semicolon, tab and angle-bracket formats", () => {
    const { rows, errors } = parseGuestPaste(
      ["Kari Nordmann, kari@example.com", "Ola Hansen;ola@example.com;Familie", "Per\tper@example.com", 'Lise <lise@example.com>', "Bare Navn"].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(rows.map((r) => [r.name, r.email, r.groupLabel])).toEqual([
      ["Kari Nordmann", "kari@example.com", null],
      ["Ola Hansen", "ola@example.com", "Familie"],
      ["Per", "per@example.com", null],
      ["Lise", "lise@example.com", null],
      ["Bare Navn", null, null],
    ]);
  });
  it("treats a non-email second column as the group", () => {
    expect(parseGuestPaste("Anne, Venner").rows[0]).toMatchObject({ name: "Anne", email: null, groupLabel: "Venner" });
  });
  it("reports bad e-mail, missing name and duplicates instead of dropping silently", () => {
    const { rows, errors } = parseGuestPaste(["A, a@x.no", "B, a@x.no", "C, broken@", ", c@x.no", "", "D, d@x.no"].join("\n"), new Set(["d@x.no"]));
    expect(rows.map((r) => r.name)).toEqual(["A"]);
    expect(errors.map((e) => [e.line, e.reason])).toEqual([[2, "duplicate"], [3, "bad_email"], [4, "no_name"], [6, "duplicate"]]);
  });
  it("stops at the room left", () => {
    const text = Array.from({ length: 5 }, (_, i) => `G${i}, g${i}@x.no`).join("\n");
    const { rows, errors } = parseGuestPaste(text, new Set(), 3);
    expect(rows).toHaveLength(3);
    expect(errors.filter((e) => e.reason === "too_many")).toHaveLength(2);
    expect(MAX_GUESTS).toBe(300);
  });
});

describe("summarizeGuests", () => {
  it("counts statuses, accepted people and diet tags per accepted person", () => {
    const s = summarizeGuests([
      g({ status: "not_sent" }),
      g({ status: "invited" }),
      g({ status: "declined" }),
      g({ status: "maybe" }),
      g({ status: "accepted", partySize: 2, diet: [{ label: "G1", tags: ["gluten", "nuts"], note: "" }, { label: "G2", tags: ["gluten"], note: "ingen sopp" }] }),
      g({ status: "declined", diet: [{ label: "x", tags: ["vegan"], note: "teller ikke" }] }),
    ]);
    expect(s).toMatchObject({ total: 6, notSent: 1, invited: 5, noAnswer: 1, acceptedGuests: 1, acceptedPeople: 2, declined: 2, maybe: 1, comments: 1 });
    expect(s.diet).toEqual({ gluten: 2, nuts: 1 });
  });
});

describe("parseSummary", () => {
  it("maps the database JSON and ignores unknown tags", () => {
    const s = parseSummary({ total: 10, not_sent: 2, invited: 8, no_answer: 3, accepted_guests: 4, accepted_people: 7, declined: 1, maybe: 0, diet: { gluten: 2, bogus: 9 }, comments: 1 });
    expect(s).toMatchObject({ total: 10, acceptedPeople: 7, comments: 1 });
    expect(s?.diet).toEqual({ gluten: 2 });
    expect(parseSummary(null)).toBeNull();
  });
});
