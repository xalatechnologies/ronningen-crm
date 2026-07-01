import { describe, expect, it } from "vitest";

import {
  buildMonthlyTrend,
  countOrgsForMrrTrendAt,
  type OrgForTrend,
} from "@/lib/admin/trend-data";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";

const org = (
  status: string,
  createdAt: string,
  isSuspended = false,
): OrgForTrend => ({
  subscriptionStatus: status,
  isSuspended,
  createdAt,
});

describe("buildMonthlyTrend", () => {
  const referenceDate = new Date("2026-06-15T12:00:00.000Z");

  it("includes trialing tenants in estimated mode", () => {
    const orgs = [
      org("trialing", "2026-01-15T00:00:00.000Z"),
      org("trialing", "2026-03-01T00:00:00.000Z"),
      org("active", "2026-02-01T00:00:00.000Z"),
    ];

    const points = buildMonthlyTrend(orgs, "estimated", referenceDate);
    const currentMonth = points[referenceDate.getMonth()];

    expect(currentMonth?.value).toBe(3 * SAAS_MONTHLY_PRICE_NOK);
  });

  it("counts only active tenants in realized mode", () => {
    const orgs = [
      org("trialing", "2026-01-15T00:00:00.000Z"),
      org("active", "2026-02-01T00:00:00.000Z"),
    ];

    const points = buildMonthlyTrend(orgs, "realized", referenceDate);
    const currentMonth = points[referenceDate.getMonth()];

    expect(currentMonth?.value).toBe(SAAS_MONTHLY_PRICE_NOK);
  });

  it("excludes suspended tenants from both modes", () => {
    const orgs = [
      org("active", "2026-01-15T00:00:00.000Z", true),
      org("trialing", "2026-01-15T00:00:00.000Z"),
    ];

    const estimated = buildMonthlyTrend(orgs, "estimated", referenceDate)[
      referenceDate.getMonth()
    ]?.value;
    const realized = buildMonthlyTrend(orgs, "realized", referenceDate)[
      referenceDate.getMonth()
    ]?.value;

    expect(estimated).toBe(SAAS_MONTHLY_PRICE_NOK);
    expect(realized).toBe(0);
  });

  it("returns january through december labels", () => {
    const points = buildMonthlyTrend([], "estimated", referenceDate);

    expect(points).toHaveLength(12);
    expect(points[0]?.label).toBe("JAN");
    expect(points[11]?.label).toBe("DES");
  });

  it("returns zero for future months in the current year", () => {
    const orgs = [org("trialing", "2026-01-15T00:00:00.000Z")];
    const points = buildMonthlyTrend(orgs, "estimated", referenceDate);

    expect(points[referenceDate.getMonth() + 1]?.value).toBe(0);
  });
});

describe("countOrgsForMrrTrendAt", () => {
  it("only counts orgs created on or before month end", () => {
    const orgs = [org("trialing", "2026-06-15T00:00:00.000Z")];
    const beforeCreation = new Date("2026-05-31T23:59:59.999Z");
    const afterCreation = new Date("2026-06-30T23:59:59.999Z");

    expect(countOrgsForMrrTrendAt(orgs, beforeCreation, "estimated")).toBe(0);
    expect(countOrgsForMrrTrendAt(orgs, afterCreation, "estimated")).toBe(1);
  });
});
