import { describe, expect, it } from "vitest";

import {
  alignRevenueTrendCurrentMonth,
  buildMonthlyTrend,
  countOrgsForMrrTrendAt,
  indexSubscriptionStatusEvents,
  parseSubscriptionStatusAuditRows,
  resolveOrgSubscriptionStatusAt,
  type OrgForTrend,
} from "@/lib/admin/trend-data";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";

const org = (
  status: string,
  createdAt: string,
  isSuspended = false,
  id = "org-1",
): OrgForTrend => ({
  id,
  subscriptionStatus: status,
  isSuspended,
  createdAt,
});

describe("buildMonthlyTrend", () => {
  const referenceDate = new Date("2026-06-15T12:00:00.000Z");

  it("ramps estimated MRR as tenants are created through the year", () => {
    const orgs = [
      org("trialing", "2026-02-01T00:00:00.000Z"),
      org("trialing", "2026-04-01T00:00:00.000Z"),
      org("trialing", "2026-06-01T00:00:00.000Z"),
    ];

    const points = buildMonthlyTrend(orgs, "estimated", referenceDate);

    expect(points[0]?.value).toBe(0);
    expect(points[1]?.value).toBe(SAAS_MONTHLY_PRICE_NOK);
    expect(points[3]?.value).toBe(2 * SAAS_MONTHLY_PRICE_NOK);
    expect(points[5]?.value).toBe(3 * SAAS_MONTHLY_PRICE_NOK);
  });

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

describe("subscription status audit history", () => {
  it("reconstructs status changes from audit rows", () => {
    const events = indexSubscriptionStatusEvents(
      parseSubscriptionStatusAuditRows([
        {
          target_id: "org-1",
          created_at: "2026-05-01T00:00:00.000Z",
          metadata: {
            after: { subscription_status: "active" },
          },
        },
        {
          target_id: "org-1",
          created_at: "2026-07-01T00:00:00.000Z",
          metadata: {
            after: { subscription_status: "canceled" },
          },
        },
      ]),
    );

    const orgRow = org("canceled", "2026-01-01T00:00:00.000Z", false, "org-1");

    expect(
      resolveOrgSubscriptionStatusAt(
        orgRow,
        new Date("2026-03-01T00:00:00.000Z"),
        events,
      ),
    ).toBe("trialing");
    expect(
      resolveOrgSubscriptionStatusAt(
        orgRow,
        new Date("2026-06-01T00:00:00.000Z"),
        events,
      ),
    ).toBe("active");
    expect(
      resolveOrgSubscriptionStatusAt(
        orgRow,
        new Date("2026-08-01T00:00:00.000Z"),
        events,
      ),
    ).toBe("canceled");
  });
});

describe("alignRevenueTrendCurrentMonth", () => {
  it("overwrites the current month with the live KPI value", () => {
    const referenceDate = new Date("2026-06-15T12:00:00.000Z");
    const points = buildMonthlyTrend([], "estimated", referenceDate);
    const aligned = alignRevenueTrendCurrentMonth(points, referenceDate, 4500);

    expect(aligned[referenceDate.getMonth()]?.value).toBe(4500);
  });
});
