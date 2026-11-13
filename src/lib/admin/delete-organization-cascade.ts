import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Customer portal tables (not in the generated types), children first. They reference bookings, so they go first. */
export const PORTAL_PURGE_ORDER = [
  "portal_activities",
  "portal_invite_designs",
  "portal_guest_emails",
  "portal_guests",
  "portal_messages",
  "portal_wish_counters",
  "portal_wish_quotes",
  "portal_wish_items",
  "portal_schedule_versions",
  "portal_schedule_items",
  "portal_accounts",
] as const;

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
  for (const table of PORTAL_PURGE_ORDER) {
    const { error } = await admin
      .from(table as never)
      .delete()
      .eq("organization_id" as never, organizationId as never);
    if (error) return { ok: false, error: `Kunne ikke slette ${table}: ${error.message}` };
  }

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
