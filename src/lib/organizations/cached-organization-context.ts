import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { resolveServerOrganizationContext } from "./organization-context";

export const getCachedServerOrganizationContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  return resolveServerOrganizationContext(supabase);
});

export const getCachedServerOrganizationId = cache(async () => {
  const context = await getCachedServerOrganizationContext();
  return context.organizationId;
});
