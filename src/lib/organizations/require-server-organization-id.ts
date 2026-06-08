import { createServerSupabaseClient } from "@/lib/supabase/server";

import { resolveServerOrganizationContext } from "./organization-context";

export async function requireServerOrganizationId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const context = await resolveServerOrganizationContext(supabase);
  if (!context.organizationId) {
    throw new Error("Ingen aktiv organisasjon.");
  }
  return context.organizationId;
}
