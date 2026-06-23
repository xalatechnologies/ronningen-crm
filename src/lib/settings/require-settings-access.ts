import type { UserRole } from "@/constants/roles";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { redirect } from "next/navigation";

export async function requireOrgAdminSettingsAccess(): Promise<{
  orgId: string;
  role: UserRole;
}> {
  const { organizationId, role } = await getCachedServerOrganizationContext();

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  if (!canManageMembers(role)) {
    redirect("/app/settings");
  }

  return { orgId: organizationId, role };
}

/** Any org member can view billing (payment actions remain owner-only). */
export async function requireOrgBillingPageAccess(): Promise<{
  orgId: string;
  role: UserRole;
  isOwner: boolean;
}> {
  const { organizationId, role } = await getCachedServerOrganizationContext();

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  return {
    orgId: organizationId,
    role,
    isOwner: role === "owner",
  };
}
