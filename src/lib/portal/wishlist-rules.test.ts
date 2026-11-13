import { describe, expect, it } from "vitest";

import {
  approvedTotalNok,
  defaultVatRate,
  vatBreakdown,
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
    expect(quoteInputSchema.safeParse({ bookingId: id, itemId: id, unitPriceNok: 10, vatIncluded: true, vatRate: 15 }).success).toBe(true);
    expect(quoteInputSchema.safeParse({ bookingId: id, itemId: id, unitPriceNok: 10, vatIncluded: true, vatRate: 20 }).success).toBe(false);
    expect(counterInputSchema.safeParse({ itemId: id, quoteId: id, unitPriceNok: 99.999 }).success).toBe(true);
    expect(counterInputSchema.safeParse({ itemId: id, unitPriceNok: 5 }).success).toBe(false); // must name the quote it answers
  });
});

describe("summaries", () => {
  const q = (total: number) => ({ id: "q", unitPriceNok: total, totalNok: total, vatIncluded: true, vatRate: 25, note: null, validUntil: null, source: "staff" as const });
  it("sums only approved items at their active quote", () => {
    const items = [
      view({ status: "approved", quote: q(500) }),
      view({ status: "approved", quote: q(250.5) }),
      view({ status: "quoted", quote: q(999) }),
      view({ status: "declined", quote: q(1) }),
    ];
    expect(approvedTotalNok(items)).toBe(750.5);
  });
  it("adds MVA to prices entered without it, so every total is comparable", () => {
    const ex15 = { ...q(100), vatIncluded: false, vatRate: 15 };
    const inc25 = q(500);
    expect(approvedTotalNok([view({ status: "approved", quote: ex15 }), view({ status: "approved", quote: inc25 })])).toBe(615);
  });
  it("uses Norwegian MVA: 15 % food and drink, 25 % the rest", () => {
    expect(defaultVatRate("food")).toBe(15);
    expect(defaultVatRate("drink")).toBe(15);
    for (const c of ["decoration", "furniture", "av", "cleaning", "other"] as const) expect(defaultVatRate(c)).toBe(25);
  });
  it("splits a total into price excluding MVA, MVA and price including MVA", () => {
    expect(vatBreakdown({ totalNok: 1000, vatRate: 25, vatIncluded: false })).toEqual({ exVat: 1000, vat: 250, incVat: 1250 });
    expect(vatBreakdown({ totalNok: 1150, vatRate: 15, vatIncluded: true })).toEqual({ exVat: 1000, vat: 150, incVat: 1150 });
    expect(vatBreakdown({ totalNok: 900, vatRate: 0, vatIncluded: false })).toEqual({ exVat: 900, vat: 0, incVat: 900 });
    const odd = vatBreakdown({ totalNok: 99.99, vatRate: 25, vatIncluded: true });
    expect(odd.exVat + odd.vat).toBeCloseTo(99.99, 2);
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
