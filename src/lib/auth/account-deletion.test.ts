import { describe, expect, it } from "vitest";

import {
  evaluateAccountDeletionEligibility,
  normalizeConfirmEmail,
} from "@/lib/auth/account-deletion-eligibility";

describe("normalizeConfirmEmail", () => {
  it("trims and lowercases email", () => {
    expect(normalizeConfirmEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("evaluateAccountDeletionEligibility", () => {
  it("blocks sole owner with no co-owner", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [
        {
          organizationId: "org-1",
          organizationName: "Test AS",
          role: "owner",
          memberCount: 3,
          ownerCount: 1,
        },
      ],
      isPlatformAdmin: false,
      platformAdminCount: 2,
    });

    expect(result.eligible).toBe(false);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]?.code).toBe("sole_owner_transfer_required");
  });

  it("blocks sole member and sole owner", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [
        {
          organizationId: "org-1",
          organizationName: "Solo Org",
          role: "owner",
          memberCount: 1,
          ownerCount: 1,
        },
      ],
      isPlatformAdmin: false,
      platformAdminCount: 2,
    });

    expect(result.eligible).toBe(false);
    expect(result.blockers[0]?.code).toBe("sole_owner_only_member");
  });

  it("allows owner when another owner exists", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [
        {
          organizationId: "org-1",
          organizationName: "Shared Org",
          role: "owner",
          memberCount: 4,
          ownerCount: 2,
        },
      ],
      isPlatformAdmin: false,
      platformAdminCount: 2,
    });

    expect(result.eligible).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("allows non-owner members", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [
        {
          organizationId: "org-1",
          organizationName: "Team Org",
          role: "manager",
          memberCount: 5,
          ownerCount: 1,
        },
      ],
      isPlatformAdmin: false,
      platformAdminCount: 2,
    });

    expect(result.eligible).toBe(true);
  });

  it("blocks sole platform admin", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [],
      isPlatformAdmin: true,
      platformAdminCount: 1,
    });

    expect(result.eligible).toBe(false);
    expect(result.blockers[0]?.code).toBe("sole_platform_admin");
  });

  it("allows platform admin when another admin exists", () => {
    const result = evaluateAccountDeletionEligibility({
      memberships: [],
      isPlatformAdmin: true,
      platformAdminCount: 2,
    });

    expect(result.eligible).toBe(true);
  });
});
