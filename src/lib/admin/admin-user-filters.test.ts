import { describe, expect, it } from "vitest";

import {
  computeAdminUserFilterCounts,
  computeAdminUserOverviewStats,
  isInactiveUser,
  matchesAdminUserFilter,
} from "@/components/admin/admin-user-filters";
import type { AdminUserRow } from "@/lib/admin/queries/users-billing-audit";

function user(
  overrides: Partial<AdminUserRow> & Pick<AdminUserRow, "id">,
): AdminUserRow {
  return {
    email: "test@example.com",
    fullName: "Test User",
    isPlatformAdmin: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSignInAt: "2026-06-01T00:00:00.000Z",
    isDisabled: false,
    organizationCount: 1,
    organizations: [{ id: "org-1", name: "Test Org", role: "owner" }],
    ...overrides,
  };
}

describe("isInactiveUser", () => {
  it("treats disabled and never-signed-in users as inactive", () => {
    expect(isInactiveUser(user({ id: "1", isDisabled: true }))).toBe(true);
    expect(isInactiveUser(user({ id: "2", lastSignInAt: null }))).toBe(true);
  });

  it("treats recent sign-in as active", () => {
    expect(
      isInactiveUser(user({ id: "3", lastSignInAt: new Date().toISOString() })),
    ).toBe(false);
  });
});

describe("computeAdminUserFilterCounts", () => {
  it("counts platform admins and users without orgs", () => {
    const users = [
      user({ id: "1", isPlatformAdmin: true }),
      user({ id: "2", organizationCount: 0, organizations: [] }),
      user({ id: "3", lastSignInAt: null }),
    ];

    expect(computeAdminUserFilterCounts(users)).toEqual({
      all: 3,
      platform_admin: 1,
      no_org: 1,
      inactive: 1,
    });
  });
});

describe("computeAdminUserOverviewStats", () => {
  it("aggregates user portfolio metrics", () => {
    const users = [
      user({ id: "1", isPlatformAdmin: true }),
      user({ id: "2", organizationCount: 0, organizations: [] }),
      user({ id: "3", lastSignInAt: null }),
    ];

    expect(computeAdminUserOverviewStats(users)).toEqual({
      total: 3,
      platformAdmins: 1,
      withOrganization: 2,
      inactive: 1,
    });
  });
});

describe("matchesAdminUserFilter", () => {
  it("filters platform admins only", () => {
    const admin = user({ id: "1", isPlatformAdmin: true });
    const member = user({ id: "2" });

    expect(matchesAdminUserFilter(admin, "platform_admin", "")).toBe(true);
    expect(matchesAdminUserFilter(member, "platform_admin", "")).toBe(false);
  });
});
