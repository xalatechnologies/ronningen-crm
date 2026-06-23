import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import { getCachedServerAuthUser } from "@/lib/supabase/cached-server-auth";
import type { Database } from "@/types/database.types";

import {
  fetchActiveOrganizationId,
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
