import type { UserRole } from "@/constants/roles";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { Database } from "@/types/database.types";

export async function requireOrgAdminSettingsAccess(
  supabase: SupabaseClient<Database>,
): Promise<{ orgId: string; role: UserRole }> {
  const { organizationId, role } = await resolveServerOrganizationContext(supabase);

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  if (!canManageMembers(role)) {
    redirect("/app/settings");
  }

  return { orgId: organizationId, role };
}

/** Any org member can view billing (payment actions remain owner-only). */
export async function requireOrgBillingPageAccess(
  supabase: SupabaseClient<Database>,
): Promise<{ orgId: string; role: UserRole; isOwner: boolean }> {
  const { organizationId, role } = await resolveServerOrganizationContext(supabase);

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  return {
    orgId: organizationId,
    role,
    isOwner: role === "owner",
  };
}
