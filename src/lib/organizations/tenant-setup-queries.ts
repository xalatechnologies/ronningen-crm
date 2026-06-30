import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import {
  fetchActiveOrganizationId,
  fetchUserOrganizations,
  resolveCurrentOrganization,
} from "@/lib/organizations/organization-queries";
import {
  isOrganizationProfileComplete,
  isTenantSetupPending,
  resolveTenantSetupStep,
  shouldPromptTenantSetup,
  tenantSetupPathForStep,
  TENANT_ONBOARDING_PATH,
  type TenantSetupStep,
} from "@/lib/organizations/tenant-setup";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export type TenantSetupStatus = {
  step: TenantSetupStep | null;
  redirectPath: string | null;
};

export async function fetchTenantSetupStatus(
  supabase: Client,
  organizationId: string,
  role: UserRole | null,
): Promise<TenantSetupStatus> {
  const [{ data: org }, { count, error: countError }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "org_number, address_line1, city, contact_email, contact_phone, tenant_setup_completed_at",
      )
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  if (!org) {
    return { step: null, redirectPath: null };
  }

  if (
    !shouldPromptTenantSetup({
      role,
      tenantSetupCompletedAt: org.tenant_setup_completed_at,
    })
  ) {
    return { step: null, redirectPath: null };
  }

  const propertyCount = countError ? 0 : (count ?? 0);
  const step = resolveTenantSetupStep({
    setupPending: isTenantSetupPending(org.tenant_setup_completed_at),
    profileComplete: isOrganizationProfileComplete(org),
    propertyCount,
  });

  if (
    step == null &&
    isTenantSetupPending(org.tenant_setup_completed_at) &&
    propertyCount > 0 &&
    isOrganizationProfileComplete(org)
  ) {
    await supabase
      .from("organizations")
      .update({ tenant_setup_completed_at: new Date().toISOString() })
      .eq("id", organizationId);
  }

  return {
    step,
    redirectPath: tenantSetupPathForStep(step),
  };
}

export async function resolvePostAuthRedirect(
  supabase: Client,
  userId: string,
): Promise<string> {
  const memberships = await fetchUserOrganizations(supabase, userId);
  if (memberships.length === 0) {
    return TENANT_ONBOARDING_PATH;
  }

  const activeOrganizationId = await fetchActiveOrganizationId(supabase, userId);
  const resolved = resolveCurrentOrganization(
    memberships,
    activeOrganizationId,
  );

  if (!resolved.organizationId) {
    return TENANT_ONBOARDING_PATH;
  }

  const setup = await fetchTenantSetupStatus(
    supabase,
    resolved.organizationId,
    resolved.role,
  );

  if (setup.redirectPath) {
    return setup.redirectPath;
  }

  return "/app/dashboard";
}
