import "server-only";

import type { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

/** The table is new and not yet in the generated types. */
export function portalAccountsTable(client: ReturnType<typeof createSupabaseAdminClient>) {
  return client.from("portal_accounts" as never);
}
