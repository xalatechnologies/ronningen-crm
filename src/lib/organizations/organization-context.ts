import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import type { Database } from "@/types/database.types";

import {
  fetchActiveOrganizationId,
  fetchUserOrganizations,
  resolveCurrentOrganization,
} from "./organization-queries";
import type { OrganizationSummary } from "./types";

type Client = SupabaseClient<Database>;

export type ServerOrganizationContext = {
  organizationId: string | null;
  organization: OrganizationSummary | null;
  role: UserRole | null;
};

export async function resolveServerOrganizationContext(
  supabase: Client,
): Promise<ServerOrganizationContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    return { organizationId: null, organization: null, role: null };
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
    organizationId: resolved.organizationId,
    organization: resolved.organization,
    role: resolved.role,
  };
}
