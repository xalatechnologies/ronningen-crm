import { describe, expect, it } from "vitest";

import {
  approvedMixedVat,
  approvedTotalNok,
  awaitingCustomer,
  awaitingVenue,
  canCounter,
  canTransition,
  counterInputSchema,
  parsePriceInput,
  quoteExpired,
  quoteInputSchema,
  quoteTotalNok,
  roundNok,
  wishItemInputSchema,
  type WishItemView,
} from "./wishlist-rules";

const view = (over: Partial<WishItemView>): WishItemView => ({
  id: "i",
  category: "food",
  title: "Kaffe",
  description: null,
  quantity: 1,
  unit: null,
  status: "draft",
  revision: 1,
  counterRounds: 0,
  quote: null,
  openCounter: null,
  ...over,
});

describe("canTransition", () => {
  it("customer sends a draft and cannot skip to approved", () => {
    expect(canTransition("customer", "draft", "requested")).toBe(true);
    expect(canTransition("customer", "draft", "approved")).toBe(false);
    expect(canTransition("customer", "requested", "approved")).toBe(false);
  });
  it("customer answers a quote three ways, plus edit and withdraw", () => {
    for (const to of ["approved", "declined", "countered", "withdrawn", "requested"] as const) {
      expect(canTransition("customer", "quoted", to)).toBe(true);
    }
  });
  it("customer cannot approve a countered item or quote it", () => {
    expect(canTransition("customer", "countered", "approved")).toBe(false);
    expect(canTransition("customer", "countered", "quoted")).toBe(false);
  });
  it("staff quotes requested items, re-quotes, and resolves counters", () => {
    expect(canTransition("staff", "requested", "quoted")).toBe(true);
    expect(canTransition("staff", "quoted", "quoted")).toBe(true);
    expect(canTransition("staff", "countered", "approved")).toBe(true);
    expect(canTransition("staff", "countered", "quoted")).toBe(true);
  });
  it("staff cannot touch drafts or approve a plain quote", () => {
    expect(canTransition("staff", "draft", "quoted")).toBe(false);
    expect(canTransition("staff", "quoted", "approved")).toBe(false);
    expect(canTransition("staff", "approved", "quoted")).toBe(false);
  });
  it("finished states only reopen as draft, by the customer", () => {
    for (const from of ["declined", "withdrawn", "unavailable"] as const) {
      expect(canTransition("customer", from, "draft")).toBe(true);
      expect(canTransition("customer", from, "approved")).toBe(false);
    }
    expect(canTransition("customer", "approved", "draft")).toBe(false);
  });
});

describe("canCounter", () => {
  it("allows up to 3 rounds and never while one is open", () => {
    expect(canCounter({ counterRounds: 0, hasOpenCounter: false })).toBe(true);
    expect(canCounter({ counterRounds: 2, hasOpenCounter: false })).toBe(true);
    expect(canCounter({ counterRounds: 3, hasOpenCounter: false })).toBe(false);
    expect(canCounter({ counterRounds: 0, hasOpenCounter: true })).toBe(false);
  });
});

describe("money", () => {
  it("rounds to 2 decimals without drift", () => {
    expect(roundNok(0.1 + 0.2)).toBe(0.3);
    expect(quoteTotalNok(12.5, 40)).toBe(500);
    expect(quoteTotalNok(33.33, 3)).toBe(99.99);
  });
  it("parses Norwegian and plain price input", () => {
    expect(parsePriceInput("1 250,50")).toBe(1250.5);
    expect(parsePriceInput("1250.5")).toBe(1250.5);
    expect(parsePriceInput("0")).toBe(0);
    expect(parsePriceInput("-5")).toBeNull();
    expect(parsePriceInput("abc")).toBeNull();
    expect(parsePriceInput("1,234")).toBeNull();
    expect(parsePriceInput(null)).toBeNull();
  });
});

describe("schemas", () => {
  it("normalizes a wish item", () => {
    const r = wishItemInputSchema.parse({ category: "food", title: "  Kaffe ", quantity: 40, description: "  ", unit: "kopper" });
    expect(r.title).toBe("Kaffe");
    expect(r.description).toBeNull();
  });
  it("rejects bad items", () => {
    expect(wishItemInputSchema.safeParse({ category: "weapons", title: "x", quantity: 1 }).success).toBe(false);
    expect(wishItemInputSchema.safeParse({ category: "food", title: "", quantity: 1 }).success).toBe(false);
    expect(wishItemInputSchema.safeParse({ category: "food", title: "x", quantity: 0 }).success).toBe(false);
  });
  it("bounds prices", () => {
    const id = "6f1c7e0a-5b1e-4d9c-9a57-1f1d2a3b4c5d";
    expect(quoteInputSchema.safeParse({ bookingId: id, itemId: id, unitPriceNok: -1, vatIncluded: true }).success).toBe(false);
    expect(quoteInputSchema.safeParse({ bookingId: id, itemId: id, unitPriceNok: 1e9, vatIncluded: true }).success).toBe(false);
    expect(counterInputSchema.safeParse({ itemId: id, quoteId: id, unitPriceNok: 99.999 }).success).toBe(true);
    expect(counterInputSchema.safeParse({ itemId: id, unitPriceNok: 5 }).success).toBe(false); // must name the quote it answers
  });
});

describe("summaries", () => {
  const q = (total: number) => ({ id: "q", unitPriceNok: total, totalNok: total, vatIncluded: true, note: null, validUntil: null, source: "staff" as const });
  it("sums only approved items at their active quote", () => {
    const items = [
      view({ status: "approved", quote: q(500) }),
      view({ status: "approved", quote: q(250.5) }),
      view({ status: "quoted", quote: q(999) }),
      view({ status: "declined", quote: q(1) }),
    ];
    expect(approvedTotalNok(items)).toBe(750.5);
  });
  it("flags a total that mixes prices with and without VAT", () => {
    const ex = { ...q(100), vatIncluded: false };
    expect(approvedMixedVat([view({ status: "approved", quote: q(500) }), view({ status: "approved", quote: ex })])).toBe(true);
    expect(approvedMixedVat([view({ status: "approved", quote: q(500) }), view({ status: "quoted", quote: ex })])).toBe(false);
  });
  it("counts who is waiting on whom", () => {
    const items = [view({ status: "quoted" }), view({ status: "requested" }), view({ status: "countered" }), view({ status: "draft" })];
    expect(awaitingCustomer(items)).toBe(1);
    expect(awaitingVenue(items)).toBe(2);
  });
});

describe("quoteExpired", () => {
  const noon = new Date("2027-03-01T12:00:00Z");
  it("is open on the valid-until day and closed the day after", () => {
    expect(quoteExpired("2027-03-01", noon)).toBe(false);
    expect(quoteExpired("2027-03-02", noon)).toBe(false);
    expect(quoteExpired("2027-02-28", noon)).toBe(true);
  });
  it("never expires without a date", () => {
    expect(quoteExpired(null, noon)).toBe(false);
  });
});
