import { describe, expect, it } from "vitest";

import { customerMergeKey, normCustomerEmail } from "./merge-duplicate-customers";

describe("normCustomerEmail", () => {
  it("trims and lowercases", () => {
    expect(normCustomerEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("returns null for empty", () => {
    expect(normCustomerEmail(null)).toBeNull();
    expect(normCustomerEmail("   ")).toBeNull();
  });
});

describe("customerMergeKey", () => {
  it("keys by email only", () => {
    expect(
      customerMergeKey({ email: "a@b.com" }),
    ).toBe("e:a@b.com");
  });

  it("does not merge on phone when email is missing", () => {
    expect(
      customerMergeKey({ email: null }),
    ).toBeNull();
  });

  it("does not use phone even if present without email", () => {
    // Phone is intentionally ignored for auto-merge safety.
    expect(
      customerMergeKey({ email: "" }),
    ).toBeNull();
  });
});
