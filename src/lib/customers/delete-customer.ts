import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type DeleteCustomerResult =
  | { ok: true; deletedInquiries: number }
  | { ok: false; error: string };

/**
 * Deletes a customer when they have no bookings or accommodation reservations.
 * Linked forespørsler (booking_inquiries) are removed first (activities cascade).
 */
export async function deleteCustomerWithClient(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  customerId: string,
): Promise<DeleteCustomerResult> {
  const [bookings, inquiries, accommodation] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("organization_id", organizationId),
    supabase
      .from("booking_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("organization_id", organizationId),
    supabase
      .from("accommodation_reservations")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("organization_id", organizationId),
  ]);

  if (bookings.error) {
    return { ok: false, error: bookings.error.message };
  }
  if (inquiries.error) {
    return { ok: false, error: inquiries.error.message };
  }
  if (accommodation.error) {
    return { ok: false, error: accommodation.error.message };
  }

  const bookingCount = bookings.count ?? 0;
  const inquiryCount = inquiries.count ?? 0;
  const accommodationCount = accommodation.count ?? 0;

  if (bookingCount > 0) {
    return {
      ok: false,
      error: `Kunden har ${bookingCount} ${bookingCount === 1 ? "reservasjon" : "reservasjoner"}. Slett eller flytt dem først.`,
    };
  }

  if (accommodationCount > 0) {
    return {
      ok: false,
      error: `Kunden har ${accommodationCount} overnattingsreservasjon${accommodationCount === 1 ? "" : "er"}. Slett dem først under Overnatting.`,
    };
  }

  if (inquiryCount > 0) {
    const { error } = await supabase
      .from("booking_inquiries")
      .delete()
      .eq("customer_id", customerId)
      .eq("organization_id", organizationId);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("organization_id", organizationId);
  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, deletedInquiries: inquiryCount };
}
