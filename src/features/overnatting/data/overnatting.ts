import type { AccommodationReservationEditInput, AccommodationUnitFormInput } from "@/lib/validations";
import type { TenantSupabaseClient } from "@/lib/queries/types";

const RESERVATION_SELECT =
  "id, unit_id, customer_id, check_in_date, check_out_date, check_in_time, check_out_time, status, guest_count, notes, total_price, customers(name), accommodation_units(name)";

/** Reads one organization's reservations that overlap the window (see `reservationFetchWindow`). */
export async function fetchReservationsInWindow(
  supabase: TenantSupabaseClient,
  organizationId: string,
  window: { endExclusive: string; beforeFetch: string },
) {
  return supabase
    .from("accommodation_reservations")
    .select(RESERVATION_SELECT)
    .eq("organization_id", organizationId)
    .lt("check_in_date", window.endExclusive)
    .gt("check_out_date", window.beforeFetch);
}

export type UnitPayload = {
  name: string;
  property_id: string | null;
  max_guests: number;
  notes: string | null;
  active: boolean;
  sort_order: number;
};

/** Unit form to database columns: trims text, empty venue becomes null, missing sort order becomes 0. */
export function toUnitPayload(data: AccommodationUnitFormInput): UnitPayload {
  return {
    name: data.name.trim(),
    property_id: data.propertyId || null,
    max_guests: data.maxGuests,
    notes: data.notes?.trim() || null,
    active: data.active,
    sort_order: data.sortOrder ?? 0,
  };
}

export type ReservationUpdatePayload = {
  unit_id: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  guest_count: number;
  status: string;
  notes: string | null;
  total_price: number | null;
};

/** Edit form to database columns: empty times and a missing or NaN price become null. */
export function toReservationUpdatePayload(data: AccommodationReservationEditInput): ReservationUpdatePayload {
  return {
    unit_id: data.unitId,
    check_in_date: data.checkInDate,
    check_out_date: data.checkOutDate,
    check_in_time: data.checkInTime === "" ? null : data.checkInTime,
    check_out_time: data.checkOutTime === "" ? null : data.checkOutTime,
    guest_count: data.guestCount,
    status: data.status,
    notes: data.notes?.trim() || null,
    total_price: data.totalPrice === undefined || Number.isNaN(data.totalPrice) ? null : data.totalPrice,
  };
}

// Note: unit and reservation updates and deletes filter by id only and rely on Row Level Security (unchanged behavior).
export async function updateUnit(supabase: TenantSupabaseClient, id: string, payload: UnitPayload) {
  const { error } = await supabase.from("accommodation_units").update(payload).eq("id", id);
  return { error };
}

export async function createUnit(supabase: TenantSupabaseClient, organizationId: string, payload: UnitPayload) {
  const { error } = await supabase
    .from("accommodation_units")
    .insert({ ...payload, organization_id: organizationId });
  return { error };
}

export async function deleteUnit(supabase: TenantSupabaseClient, id: string) {
  const { error } = await supabase.from("accommodation_units").delete().eq("id", id);
  return { error };
}

export async function updateReservation(supabase: TenantSupabaseClient, id: string, payload: ReservationUpdatePayload) {
  const { error } = await supabase.from("accommodation_reservations").update(payload).eq("id", id);
  return { error };
}

export async function deleteReservation(supabase: TenantSupabaseClient, id: string) {
  const { error } = await supabase.from("accommodation_reservations").delete().eq("id", id);
  return { error };
}
