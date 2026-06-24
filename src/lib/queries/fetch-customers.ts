import type { CustomerBookingListItem } from "@/components/customers/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";

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

import type { Database } from "@/types/database.types";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type PartnerRow = Database["public"]["Tables"]["partners"]["Row"];

export type CustomersPageData = {
  customers: CustomerRow[];
  partners: PartnerRow[];
  bookings: CustomerBookingListItem[];
  loadError: string | null;
};

const CUSTOMER_COLUMNS =
  "id, organization_id, name, email, phone, address, notes, created_at, updated_at";
const PARTNER_COLUMNS =
  "id, organization_id, category, name, phone, email, notes, created_at, updated_at";

export async function fetchCustomersPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
): Promise<CustomersPageData> {
  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: bookingsRaw, error: bErr } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, event_type, event_date, guest_count, total_price, remaining_amount, status, properties(name)",
    )
    .eq("organization_id", orgId)
    .order("event_date", { ascending: false });

  const { data: partners, error: pErr } = await supabase
    .from("partners")
    .select(PARTNER_COLUMNS)
    .eq("organization_id", orgId)
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

  return {
    customers: customers ?? [],
    partners: partners ?? [],
    bookings,
    loadError,
  };
}
