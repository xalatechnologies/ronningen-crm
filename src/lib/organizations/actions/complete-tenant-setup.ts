"use server";

import { revalidatePath } from "next/cache";

import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { getServerT } from "@/lib/i18n/server-messages";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

export async function completeTenantSetup(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const [{ organizationId, role }, supabase] = await Promise.all([
    getCachedServerOrganizationContext(),
    getCachedServerSupabaseClient(),
  ]);

  if (!organizationId || !role) {
    const t = await getServerT();
    return { ok: false, error: t("organizations.noActiveOrg") };
  }

  if (!canManageMembers(role)) {
    const t = await getServerT();
    return {
      ok: false,
      error: t("serverErrors.billing.mustBeOwner"),
    };
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("organizations")
    .update({ tenant_setup_completed_at: completedAt })
    .eq("id", organizationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app", "layout");
  revalidatePath("/app/settings/organization");
  revalidatePath("/app/settings/lokaler");
  revalidatePath("/app/dashboard");

  return { ok: true };
}
