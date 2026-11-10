import { describe, expect, it } from "vitest";

import {
  generateClientRequestId,
  normalizeCustomerEmail,
  normalizeCustomerPhone,
} from "./customer-identity";

describe("normalizeCustomerPhone", () => {
  it("strips formatting and NO country code", () => {
    expect(normalizeCustomerPhone("+47 966 65 001")).toBe("96665001");
    expect(normalizeCustomerPhone("96665001")).toBe("96665001");
    expect(normalizeCustomerPhone("004796665001")).toBe("96665001");
  });

  it("returns null for empty", () => {
    expect(normalizeCustomerPhone(null)).toBeNull();
    expect(normalizeCustomerPhone("abc")).toBeNull();
  });
});

describe("normalizeCustomerEmail", () => {
  it("lowercases", () => {
    expect(normalizeCustomerEmail("A@B.COM")).toBe("a@b.com");
  });
});

describe("generateClientRequestId", () => {
  it("returns a uuid-shaped string", () => {
    expect(generateClientRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns distinct ids across calls", () => {
    expect(generateClientRequestId()).not.toBe(generateClientRequestId());
  });
});
