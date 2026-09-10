import { describe, expect, it } from "vitest";

import {
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
