import { OvernattingSection } from "@/components/overnatting/overnatting-section";
import type {
  AccommodationReservationRow,
  AccommodationUnitRow,
} from "@/components/overnatting/types";
import { canManageBookings } from "@/lib/role-access";
import {
  dayBeforeYmd,
  monthEndExclusiveYm,
  monthFirstDayYm,
} from "@/lib/overnatting-month";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function ymFromParams(raw: string | undefined): string {
  const t = raw?.trim();
  if (t && /^\d{4}-\d{2}$/.test(t)) return t;
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

type RawUnit = {
  id: string;
  name: string;
  property_id: string | null;
  max_guests: number;
  notes: string | null;
  active: boolean;
  sort_order: number;
  properties: { name: string } | null;
};

type RawRes = {
  id: string;
  unit_id: string;
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  guest_count: number;
  notes: string | null;
  total_price: number | null;
  customers: { name: string } | null;
  accommodation_units: { name: string } | null;
};

export default async function OvernattingPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canEdit = canManageBookings(role);
  const sp = await searchParams;
  const initialYm = ymFromParams(sp.ym);

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: rawUnits, error: uErr } = await supabase
    .from("accommodation_units")
    .select("id, name, property_id, max_guests, notes, active, sort_order, properties(name)")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const monthStart = monthFirstDayYm(initialYm);
  const endEx = monthEndExclusiveYm(initialYm);
  const beforeMonth = monthStart ? dayBeforeYmd(monthStart) : "";

  let rawRes: RawRes[] | null = null;
  let rErr: string | null = null;
  if (monthStart && endEx && beforeMonth) {
    const q = await supabase
      .from("accommodation_reservations")
      .select(
        "id, unit_id, customer_id, check_in_date, check_out_date, check_in_time, check_out_time, status, guest_count, notes, total_price, customers(name), accommodation_units(name)",
      )
      .eq("organization_id", orgId)
      .lt("check_in_date", endEx)
      .gt("check_out_date", beforeMonth);
    rawRes = q.data as RawRes[] | null;
    rErr = q.error?.message ?? null;
  }

  const loadError = uErr?.message ?? rErr ?? null;

  const units: AccommodationUnitRow[] = (rawUnits ?? []).map((row) => {
    const r = row as unknown as RawUnit;
    return {
      id: r.id,
      name: r.name,
      propertyId: r.property_id,
      propertyName: r.properties?.name ?? null,
      maxGuests: Number(r.max_guests) || 1,
      notes: r.notes,
      active: r.active,
      sortOrder: r.sort_order ?? 0,
    };
  });

  const initialReservations: AccommodationReservationRow[] = (rawRes ?? []).map(
    (r) => {
      const st = r.status;
      const ok =
        st === "tentative" || st === "confirmed" || st === "cancelled";
      return {
        id: r.id,
        unitId: r.unit_id,
        unitName: r.accommodation_units?.name ?? "—",
        customerId: r.customer_id,
        customerName: r.customers?.name?.trim() || "Ukjent",
        checkInDate: r.check_in_date.slice(0, 10),
        checkOutDate: r.check_out_date.slice(0, 10),
        checkInTime:
          r.check_in_time != null && String(r.check_in_time).trim() !== ""
            ? String(r.check_in_time).trim()
            : null,
        checkOutTime:
          r.check_out_time != null && String(r.check_out_time).trim() !== ""
            ? String(r.check_out_time).trim()
            : null,
        status: ok ? st : "confirmed",
        guestCount: r.guest_count,
        notes: r.notes ?? null,
        totalPrice:
          r.total_price != null && Number.isFinite(Number(r.total_price))
            ? Number(r.total_price)
            : null,
      };
    },
  );

  return (
    <OvernattingSection
      units={units}
      initialReservations={initialReservations}
      initialYm={initialYm}
      properties={properties ?? []}
      canManage={canEdit}
      loadError={loadError}
    />
  );
}
