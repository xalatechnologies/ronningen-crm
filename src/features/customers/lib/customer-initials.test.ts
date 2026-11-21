import { describe, expect, it } from "vitest";

import { customerInitials } from "@/features/customers/lib/customer-initials";

describe("customerInitials", () => {
  it("uses the first and the last word", () => {
    expect(customerInitials("Kari Anne Nordmann")).toBe("KN");
    expect(customerInitials("hamid rahmani")).toBe("HR");
  });

  it("uses the first two letters of a single word", () => {
    expect(customerInitials("Test")).toBe("TE");
  });

  it("falls back to a question mark for an empty name and ignores extra spaces", () => {
    expect(customerInitials("   ")).toBe("?");
    expect(customerInitials("  Ola   Hansen ")).toBe("OH");
  });
});
