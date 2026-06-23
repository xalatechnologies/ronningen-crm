import { cache } from "react";

import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

import { resolveServerOrganizationContext } from "./organization-context";

export const getCachedServerOrganizationContext = cache(async () => {
  const supabase = await getCachedServerSupabaseClient();
  return resolveServerOrganizationContext(supabase);
});

export const getCachedServerOrganizationId = cache(async () => {
  const context = await getCachedServerOrganizationContext();
  return context.organizationId;
});
