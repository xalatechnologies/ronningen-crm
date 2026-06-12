import { describe, expect, it } from "vitest";

import { computeRevenueMetrics } from "@/lib/admin/revenue-metrics";
import { formatMonthOverMonth } from "@/lib/admin/queries/revenue";

const org = (
  status: string,
  createdAt = "2026-06-01T00:00:00.000Z",
) => ({
  subscriptionStatus: status,
  isSuspended: false,
  createdAt,
});

describe("computeRevenueMetrics", () => {
  it("counts MRR from active subscriptions only", () => {
    const metrics = computeRevenueMetrics(
      [org("active"), org("trialing"), org("past_due")],
      0,
      0,
      2,
    );

    expect(metrics.mrrNok).toBe(500);
    expect(metrics.potentialMrrNok).toBe(1000);
    expect(metrics.trialingSubscriptions).toBe(1);
    expect(metrics.activeSubscriptions).toBe(1);
  });

  it("excludes suspended orgs from paying counts", () => {
    const metrics = computeRevenueMetrics(
      [{ ...org("active"), isSuspended: true }, org("active")],
      0,
      0,
      0,
    );

    expect(metrics.mrrNok).toBe(500);
    expect(metrics.activeSubscriptions).toBe(1);
  });
});

describe("formatMonthOverMonth", () => {
  it("returns Ny when previous month had no revenue", () => {
    expect(formatMonthOverMonth(120_000, 0)).toBe("Ny");
    expect(formatMonthOverMonth(0, 0)).toBe("—");
  });
});
