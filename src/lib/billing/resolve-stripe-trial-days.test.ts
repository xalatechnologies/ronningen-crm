import { describe, expect, it } from "vitest";

import { resolveRemainingTrialDays } from "@/lib/billing/resolve-stripe-trial-days";

describe("resolveRemainingTrialDays", () => {
  it("returns 0 when period end is in the past", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(resolveRemainingTrialDays(past)).toBe(0);
  });

  it("returns whole days remaining", () => {
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(resolveRemainingTrialDays(inThreeDays)).toBe(3);
  });

  it("returns 0 when period end is missing", () => {
    expect(resolveRemainingTrialDays(null)).toBe(0);
  });
});
