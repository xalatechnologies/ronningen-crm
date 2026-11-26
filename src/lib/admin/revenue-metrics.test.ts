import { describe, expect, it } from "vitest";

import { computeRevenueMetrics } from "@/lib/admin/revenue-metrics";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
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

    expect(metrics.mrrNok).toBe(SAAS_MONTHLY_PRICE_NOK);
    expect(metrics.potentialMrrNok).toBe(SAAS_MONTHLY_PRICE_NOK * 2);
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

    expect(metrics.mrrNok).toBe(SAAS_MONTHLY_PRICE_NOK);
    expect(metrics.activeSubscriptions).toBe(1);
  });
});

describe("churn", () => {
  const old = "2025-01-01T00:00:00.000Z";

  it("has no rate when nobody was paying 30 days ago", () => {
    const metrics = computeRevenueMetrics([org("trialing", old)], 0, 0, 0);
    expect(metrics.churnRate30d).toBeNull();
  });

  it("divides paying cancellations by customers paying at the start", () => {
    const metrics = computeRevenueMetrics([org("active", old), org("active", old), org("active", old)], 1, 0, 0);
    expect(metrics.churnRate30d).toBe(25);
  });
});

describe("formatMonthOverMonth", () => {
  it("returns Ny when previous month had no revenue", () => {
    expect(formatMonthOverMonth(120_000, 0)).toBe("Ny");
    expect(formatMonthOverMonth(0, 0)).toBe("—");
  });
});
