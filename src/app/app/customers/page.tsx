import {
  CustomersSection,
} from "@/components/customers/customers-section";
import type { CustomerBookingListItem } from "@/components/customers/types";
import { mergeDuplicateCustomersWithClient } from "@/lib/customers/merge-duplicate-customers";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
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
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canMergeDuplicates = role === "owner" || role === "admin";

  if (canMergeDuplicates) {
    await mergeDuplicateCustomersWithClient(supabase, orgId, role);
  }

  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("*")
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
    .select("*")
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

  return (
    <CustomersSection
      customers={customers ?? []}
      partners={partners ?? []}
      bookings={bookings}
      loadError={loadError}
    />
  );
}
