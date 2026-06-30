import { describe, expect, it } from "vitest";

import { shouldDeleteAuthUserAfterOrgDelete } from "@/lib/admin/delete-organization-members";

describe("shouldDeleteAuthUserAfterOrgDelete", () => {
  it("deletes tenant users with no remaining memberships", () => {
    expect(
      shouldDeleteAuthUserAfterOrgDelete({
        isPlatformAdmin: false,
        remainingMembershipCount: 0,
      }),
    ).toBe(true);
  });

  it("keeps users who belong to another organization", () => {
    expect(
      shouldDeleteAuthUserAfterOrgDelete({
        isPlatformAdmin: false,
        remainingMembershipCount: 1,
      }),
    ).toBe(false);
  });

  it("never deletes platform admins automatically", () => {
    expect(
      shouldDeleteAuthUserAfterOrgDelete({
        isPlatformAdmin: true,
        remainingMembershipCount: 0,
      }),
    ).toBe(false);
  });
});
