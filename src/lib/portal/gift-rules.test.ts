import { describe, expect, it } from "vitest";

import {
  giftRateLimited,
  giftSettingsSchema,
  giftWishInputSchema,
  giversVisible,
  parseGiftPrice,
  parseGiftQuantity,
  safeHttpsUrl,
  toCoupleView,
  toGuestView,
  type GiftWish,
} from "./gift-rules";

const base = { kind: "gift" as const, title: "Kaffemaskin", note: "" };

describe("safeHttpsUrl", () => {
  it("accepts normal https links", () => {
    expect(safeHttpsUrl("https://www.example.com/p/123?x=1")).toBe("https://www.example.com/p/123?x=1");
  });
  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "https://user:pw@example.com",
    "https://192.168.0.1/x",
    "https://localhost/x",
    "https://example.com:8443/",
    "https://xn--pple-43d.com",
    "https://nodot",
    "https://exa mple.com",
    "ftp://example.com",
  ])("rejects %s", (u) => expect(safeHttpsUrl(u)).toBeNull());
});

describe("giftWishInputSchema", () => {
  it("accepts a minimal wish and defaults the rest", () => {
    const r = giftWishInputSchema.parse(base);
    expect(r).toMatchObject({ url: null, imageUrl: null, priceNok: null, note: "" });
  });
  it("normalises empty link fields to null and keeps valid ones", () => {
    const r = giftWishInputSchema.parse({ ...base, url: "", imageUrl: "https://img.example.com/a.jpg", priceNok: 499 });
    expect(r.url).toBeNull();
    expect(r.imageUrl).toBe("https://img.example.com/a.jpg");
  });
  it("rejects phishing-style links in title and note", () => {
    expect(giftWishInputSchema.safeParse({ ...base, title: "Se https://evil.example" }).success).toBe(false);
    expect(giftWishInputSchema.safeParse({ ...base, note: "gå til bank-login.com" }).success).toBe(false);
  });
  it("rejects unsafe url fields, bad kind, bad price, empty title", () => {
    expect(giftWishInputSchema.safeParse({ ...base, url: "http://example.com" }).success).toBe(false);
    expect(giftWishInputSchema.safeParse({ ...base, kind: "cash" }).success).toBe(false);
    expect(giftWishInputSchema.safeParse({ ...base, priceNok: -1 }).success).toBe(false);
    expect(giftWishInputSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
  });
});

describe("parseGiftPrice", () => {
  it("parses common Norwegian formats", () => {
    expect(parseGiftPrice("1 200")).toBe(1200);
    expect(parseGiftPrice("499,-")).toBe(499);
    expect(parseGiftPrice("99,90 kr")).toBe(100);
    expect(parseGiftPrice("")).toBeNull();
  });
  it("rejects nonsense", () => {
    expect(parseGiftPrice("abc")).toBeUndefined();
    expect(parseGiftPrice("-5")).toBeUndefined();
    expect(parseGiftPrice("99999999")).toBeUndefined();
  });
});

describe("giversVisible", () => {
  const now = new Date("2027-06-12T10:00:00Z");
  it("event_date: hidden until the day after the event", () => {
    expect(giversVisible("event_date", "2027-06-12", now)).toBe(false);
    expect(giversVisible("event_date", "2027-06-11", now)).toBe(true);
    expect(giversVisible("event_date", null, now)).toBe(false);
  });
  it("never and now are absolute", () => {
    expect(giversVisible("never", "2020-01-01", now)).toBe(false);
    expect(giversVisible("now", null, now)).toBe(true);
  });
  it("settings reject unknown modes", () => {
    expect(giftSettingsSchema.safeParse({ shared: true, revealMode: "later" }).success).toBe(false);
  });
});

describe("giftRateLimited", () => {
  const now = new Date("2027-01-01T00:00:10Z");
  it("limits fast repeats and runaway counts", () => {
    expect(giftRateLimited("2027-01-01T00:00:09.5Z", 1, now)).toBe(true);
    expect(giftRateLimited("2027-01-01T00:00:05Z", 1, now)).toBe(false);
    expect(giftRateLimited(null, 200, now)).toBe(true);
  });
});

describe("views", () => {
  const w = (id: string, quantity = 1): GiftWish => ({ id, kind: "gift", title: id, url: null, imageUrl: null, priceNok: null, note: "", quantity });
  const names = new Map([["g1", "Kari"], ["g2", "Ola"], ["g3", "Per"]]);

  it("couple sees how many are taken, names only when allowed", () => {
    const wishes = [w("a"), w("b", 3), w("c")];
    const claims = new Map([["a", ["g1"]], ["b", ["g2", "g3"]]]);
    expect(toCoupleView(wishes, claims, names, false).map((x) => [x.takenCount, x.giverNames])).toEqual([[1, []], [2, []], [0, []]]);
    expect(toCoupleView(wishes, claims, names, true).map((x) => x.giverNames)).toEqual([["Kari"], ["Ola", "Per"], []]);
  });

  it("guest sees mine / taken (all places gone) / free with places left", () => {
    const wishes = [w("a"), w("b", 3), w("c", 2), w("d", 2)];
    const claims = new Map([["a", ["g2"]], ["b", ["g2", "g3"]], ["c", ["g2", "g3"]], ["d", ["g1", "g2"]]]);
    const v = toGuestView(wishes, claims, "g1");
    expect(v.map((x) => [x.state, x.left])).toEqual([["taken", 0], ["free", 1], ["taken", 0], ["mine", 0]]);
    expect(JSON.stringify(v)).not.toContain("Ola");
  });

  it("a wish with several places stays free until the last one is taken", () => {
    const wishes = [w("wine", 6)];
    for (let n = 0; n < 6; n++) {
      const claims = new Map([["wine", Array.from({ length: n }, (_, i) => `g${i + 10}`)]]);
      const [view] = toGuestView(wishes, claims, "me");
      expect(view.state).toBe(n < 6 ? "free" : "taken");
      expect(view.left).toBe(6 - n);
    }
    expect(toGuestView(wishes, new Map([["wine", ["a", "b", "c", "d", "e", "f"]]]), "me")[0]).toMatchObject({ state: "taken", left: 0 });
  });
});

describe("quantity", () => {
  it("defaults to 1 and accepts 1..99", () => {
    expect(giftWishInputSchema.parse(base).quantity).toBe(1);
    expect(giftWishInputSchema.safeParse({ ...base, quantity: 6 }).success).toBe(true);
    expect(giftWishInputSchema.safeParse({ ...base, quantity: 99 }).success).toBe(true);
  });
  it("rejects 0, 100, fractions", () => {
    for (const quantity of [0, 100, -2, 1.5]) expect(giftWishInputSchema.safeParse({ ...base, quantity }).success).toBe(false);
  });
  it("parseGiftQuantity reads whole numbers only", () => {
    expect(parseGiftQuantity("6")).toBe(6);
    expect(parseGiftQuantity(" 12 ")).toBe(12);
    for (const bad of ["", "0", "100", "abc", "1,5", "-3"]) expect(parseGiftQuantity(bad)).toBeUndefined();
  });
});
