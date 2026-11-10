import { describe, expect, it } from "vitest";

import { resolveTenantAppOrganization } from "@/lib/organizations/resolve-tenant-app-organization";
import type { OrganizationMembership } from "@/lib/organizations/types";

const membership = (
  overrides: Partial<OrganizationMembership> & Pick<OrganizationMembership, "organizationId">,
): OrganizationMembership => ({
  role: "owner",
  organization: {
    id: overrides.organizationId,
    name: "Test Org",
    slug: "test-org",
    logoUrl: null,
    subscriptionStatus: "trialing",
    subscriptionPlan: "starter",
    isSuspended: false,
    suspendedReason: null,
    billingExempt: false,
    periodEnd: null,
    providerSubscriptionId: null,
  },
  ...overrides,
});

describe("resolveTenantAppOrganization", () => {
  it("returns null when the user has no memberships", () => {
    expect(resolveTenantAppOrganization([], "missing-org")).toBeNull();
  });

  it("ignores a stale active organization id", () => {
    const current = membership({ organizationId: "org-a" });

    expect(
      resolveTenantAppOrganization([current], "deleted-org"),
    ).toEqual(current);
  });
});
