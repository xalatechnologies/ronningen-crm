import { describe, expect, it } from "vitest";

import { normalizeEmail } from "./normalize-email";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Post@Example.NO  ")).toBe("post@example.no");
  });

  it("removes zero-width characters", () => {
    expect(normalizeEmail("post\u200B@example.no")).toBe("post@example.no");
  });
});
