import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import { getImpersonationContext } from "@/lib/admin/impersonation";
import { getCachedServerAuthUser } from "@/lib/supabase/cached-server-auth";
import type { Database } from "@/types/database.types";

import {
  fetchActiveOrganizationId,
  fetchOrganizationSummaryById,
  fetchUserOrganizations,
  resolveCurrentOrganization,
} from "./organization-queries";
import type { OrganizationSummary } from "./types";

type Client = SupabaseClient<Database>;

export type ServerOrganizationContext = {
  userId: string | null;
  organizationId: string | null;
  organization: OrganizationSummary | null;
  role: UserRole | null;
};

export async function resolveServerOrganizationContext(
  supabase: Client,
): Promise<ServerOrganizationContext> {
  const user = await getCachedServerAuthUser();
  if (!user) {
    return {
      userId: null,
      organizationId: null,
      organization: null,
      role: null,
    };
  }

  // Platform admin "view as organization": act as that organization's owner. Data access is
  // granted by RLS only while the logged session is open (is_impersonating_org).
  const impersonation = await getImpersonationContext();
  if (impersonation) {
    const organization = await fetchOrganizationSummaryById(
      supabase,
      impersonation.organizationId,
    );
    if (organization) {
      return {
        userId: user.id,
        organizationId: organization.id,
        organization,
        role: "owner",
      };
    }
  }

  const [memberships, activeOrganizationId] = await Promise.all([
    fetchUserOrganizations(supabase, user.id),
    fetchActiveOrganizationId(supabase, user.id),
  ]);

  const resolved = resolveCurrentOrganization(
    memberships,
    activeOrganizationId,
  );

  return {
    userId: user.id,
    organizationId: resolved.organizationId,
    organization: resolved.organization,
    role: resolved.role,
  };
}
