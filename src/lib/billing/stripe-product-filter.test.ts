import { describe, expect, it } from "vitest";

import { isEventManagerSubscription } from "@/lib/billing/stripe-product-filter";

const sub = (price: string, product: string | { id: string }) => ({
  items: { data: [{ price: { id: price, product } }] },
});

describe("isEventManagerSubscription", () => {
  const config = { productId: "prod_em", priceId: "price_em" };

  it("accepts a subscription on the Event Manager product, with the product as id or object", () => {
    expect(isEventManagerSubscription(sub("price_x", "prod_em"), config)).toBe(true);
    expect(isEventManagerSubscription(sub("price_x", { id: "prod_em" }), config)).toBe(true);
  });

  it("rejects a subscription on another product, such as Digilist", () => {
    expect(isEventManagerSubscription(sub("price_dl", "prod_digilist"), config)).toBe(false);
  });

  it("falls back to the price id when no product id is configured", () => {
    expect(isEventManagerSubscription(sub("price_em", "prod_other"), { productId: null, priceId: "price_em" })).toBe(true);
    expect(isEventManagerSubscription(sub("price_dl", "prod_other"), { productId: null, priceId: "price_em" })).toBe(false);
  });

  it("cannot tell products apart when nothing is configured, so it accepts (old behaviour)", () => {
    expect(isEventManagerSubscription(sub("price_dl", "prod_other"), { productId: null, priceId: null })).toBe(true);
  });

  it("rejects a subscription without items", () => {
    expect(isEventManagerSubscription({ items: { data: [] } }, config)).toBe(false);
  });
});
