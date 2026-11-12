import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import { canManageBookings } from "@/lib/organizations/organization-permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type StaffBookingAccess =
  | {
      ok: true;
      userId: string;
      organizationId: string;
      role: UserRole;
      supabase: SupabaseClient<Database>;
    }
  | { ok: false; error: "authentication_required" | "forbidden" };

/**
 * Signed-in staff with write access to one booking. The booking is read through RLS, so only members
 * of its organization can resolve it; the organization is never taken from the client.
 */
export async function requireStaffForBooking(bookingId: string): Promise<StaffBookingAccess> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "authentication_required" };

  const { data: booking } = await supabase
    .from("bookings")
    .select("organization_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "forbidden" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", booking.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (member?.role ?? null) as UserRole | null;
  if (!role || !canManageBookings(role)) return { ok: false, error: "forbidden" };

  return { ok: true, userId: user.id, organizationId: booking.organization_id, role, supabase };
}
