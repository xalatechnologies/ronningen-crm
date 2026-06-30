import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Child tables must be removed before organizations (FK is ON DELETE RESTRICT). */
export const TENANT_PURGE_ORDER = [
  "accommodation_reservations",
  "booking_inquiries",
  "bookings",
  "accommodation_units",
  "transactions",
  "assets",
  "partners",
  "packages",
  "services",
  "customers",
  "properties",
] as const satisfies ReadonlyArray<keyof Database["public"]["Tables"]>;

export async function purgeOrganizationTenantData(
  admin: SupabaseClient<Database>,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const table of TENANT_PURGE_ORDER) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("organization_id", organizationId);

    if (error) {
      return {
        ok: false,
        error: `Kunne ikke slette ${table}: ${error.message}`,
      };
    }
  }

  return { ok: true };
}
