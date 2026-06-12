import { describe, expect, it } from "vitest";

import {
  computeAdminOrgFilterCounts,
  computeAdminOrgOverviewStats,
  matchesAdminOrgFilter,
} from "@/components/admin/admin-org-filters";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";

function org(
  overrides: Partial<AdminOrganizationRow> & Pick<AdminOrganizationRow, "id">,
): AdminOrganizationRow {
  return {
    name: "Test Org",
    slug: "test-org",
    subscriptionStatus: "active",
    subscriptionPlan: "standard",
    isSuspended: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberCount: 1,
    venueCount: 0,
    trialEnds: null,
    providerSubscriptionId: "sub_123",
    lastActivityAt: null,
    totalRevenue: 0,
    unpaidRemaining: 0,
    bookingsLast30d: 0,
    billingEmail: null,
    contactEmail: null,
    orgNumber: null,
    health: { score: 80, tier: "healthy" },
    ...overrides,
  };
}

describe("computeAdminOrgFilterCounts", () => {
  it("counts incomplete separately from active", () => {
    const organizations = [
      org({ id: "1", subscriptionStatus: "trialing" }),
      org({ id: "2", subscriptionStatus: "active" }),
      org({ id: "3", subscriptionStatus: "incomplete" }),
      org({ id: "4", isSuspended: true, subscriptionStatus: "active" }),
    ];

    expect(computeAdminOrgFilterCounts(organizations)).toEqual({
      all: 4,
      active: 2,
      incomplete: 1,
      suspended: 1,
      past_due: 0,
      canceled: 0,
      enterprise: 0,
    });
  });
});

describe("computeAdminOrgOverviewStats", () => {
  it("aggregates portfolio metrics", () => {
    const organizations = [
      org({ id: "1", subscriptionStatus: "trialing", venueCount: 2, totalRevenue: 1000 }),
      org({ id: "2", subscriptionStatus: "active", venueCount: 1, totalRevenue: 500 }),
      org({ id: "3", subscriptionStatus: "incomplete", venueCount: 0, totalRevenue: 0 }),
      org({ id: "4", isSuspended: true, subscriptionStatus: "active", totalRevenue: 200 }),
    ];

    expect(computeAdminOrgOverviewStats(organizations)).toEqual({
      total: 4,
      active: 2,
      needsFollowUp: 2,
      totalRevenue: 1700,
      totalVenues: 3,
    });
  });
});

describe("matchesAdminOrgFilter", () => {
  it("matches incomplete orgs only for incomplete filter", () => {
    const incomplete = org({ id: "1", subscriptionStatus: "incomplete" });

    expect(matchesAdminOrgFilter(incomplete, "", "incomplete")).toBe(true);
    expect(matchesAdminOrgFilter(incomplete, "", "active")).toBe(false);
    expect(matchesAdminOrgFilter(incomplete, "", "all")).toBe(true);
  });
});
