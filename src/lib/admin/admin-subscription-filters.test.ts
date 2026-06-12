import { describe, expect, it } from "vitest";

import {
  computeAdminSubscriptionFilterCounts,
  computeAdminSubscriptionOverviewStats,
  matchesAdminSubscriptionFilter,
} from "@/components/admin/admin-subscription-filters";
import type { AdminBillingRow } from "@/lib/admin/queries/users-billing-audit";
import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";

function row(
  overrides: Partial<AdminBillingRow> & Pick<AdminBillingRow, "id">,
): AdminBillingRow {
  return {
    name: "Test Org",
    slug: "test-org",
    billingEmail: null,
    subscriptionStatus: "active",
    subscriptionPlan: "standard",
    isSuspended: false,
    periodEnd: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    memberCount: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeAdminSubscriptionFilterCounts", () => {
  it("counts trialing and incomplete separately", () => {
    const rows = [
      row({ id: "1", subscriptionStatus: "trialing" }),
      row({ id: "2", subscriptionStatus: "incomplete" }),
      row({ id: "3", isSuspended: true, subscriptionStatus: "active" }),
    ];

    expect(computeAdminSubscriptionFilterCounts(rows)).toEqual({
      all: 3,
      active: 0,
      trialing: 1,
      incomplete: 1,
      past_due: 0,
      canceled: 0,
      suspended: 1,
    });
  });
});

describe("computeAdminSubscriptionOverviewStats", () => {
  it("aggregates subscription metrics", () => {
    const rows = [
      row({ id: "1", subscriptionStatus: "trialing" }),
      row({ id: "2", subscriptionStatus: "active", providerSubscriptionId: "sub_1" }),
      row({ id: "3", subscriptionStatus: "incomplete" }),
      row({ id: "4", isSuspended: true, subscriptionStatus: "active" }),
    ];

    expect(
      computeAdminSubscriptionOverviewStats(rows, SAAS_MONTHLY_PRICE_NOK),
    ).toEqual({
      total: 4,
      active: 1,
      trialing: 1,
      stripeConnected: 1,
      mrrNok: SAAS_MONTHLY_PRICE_NOK,
    });
  });
});

describe("matchesAdminSubscriptionFilter", () => {
  it("matches incomplete rows", () => {
    const incomplete = row({ id: "1", subscriptionStatus: "incomplete" });

    expect(matchesAdminSubscriptionFilter(incomplete, "", "incomplete")).toBe(
      true,
    );
    expect(matchesAdminSubscriptionFilter(incomplete, "", "trialing")).toBe(
      false,
    );
  });
});
