import {
  CustomersSection,
} from "@/components/customers/customers-section";
import type { CustomerBookingListItem } from "@/components/customers/types";
import { mergeDuplicateCustomersWithClient } from "@/lib/customers/merge-duplicate-customers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RawBooking = {
  id: string;
  customer_id: string;
  event_type: string;
  event_date: string;
  guest_count: number;
  total_price: number;
  remaining_amount: number;
  status: string;
  properties: { name: string } | null;
};

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canMergeDuplicates = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    canMergeDuplicates =
      profile?.role === "owner" || profile?.role === "admin";
  }

  if (canMergeDuplicates) {
    await mergeDuplicateCustomersWithClient(supabase);
  }

  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: bookingsRaw, error: bErr } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, event_type, event_date, guest_count, total_price, remaining_amount, status, properties(name)",
    )
    .order("event_date", { ascending: false });

  const { data: partners, error: pErr } = await supabase
    .from("partners")
    .select("*")
    .order("name", { ascending: true });

  const loadError = cErr?.message ?? bErr?.message ?? pErr?.message ?? null;

  const bookings: CustomerBookingListItem[] = (bookingsRaw ?? []).map((row) => {
    const r = row as unknown as RawBooking;
    return {
      id: r.id,
      customer_id: r.customer_id,
      event_type: r.event_type,
      event_date: r.event_date,
      guest_count: r.guest_count,
      total_price: r.total_price,
      remaining_amount: r.remaining_amount,
      status: r.status,
      propertyName: r.properties?.name ?? null,
    };
  });

  return (
    <CustomersSection
      customers={customers ?? []}
      partners={partners ?? []}
      bookings={bookings}
      loadError={loadError}
    />
  );
}
