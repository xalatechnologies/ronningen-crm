import { isActiveInquiry, type InquiryListRow } from "@/components/inquiries/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import { canManageBookings } from "@/lib/role-access";
import type { UserRole } from "@/constants/roles";
import type { BookingInquiryStatus } from "@/lib/validations";

type RawInquiry = {
  id: string;
  customer_id: string;
  property_id: string | null;
  event_type: string;
  fest_type: string | null;
  preferred_event_date: string | null;
  preferred_event_end_date: string | null;
  guest_count: number;
  estimated_total: number | null;
  status: string;
  next_follow_up_at: string | null;
  internal_notes: string | null;
  converted_booking_id: string | null;
  converted_at: string | null;
  updated_at: string;
  customers: { name: string; phone: string | null; email: string | null } | null;
  properties: { name: string } | null;
};

export type InquiriesPageData = {
  inquiries: InquiryListRow[];
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  canManageInquiries: boolean;
  loadError: string | null;
};

function normalizeInquiryStatus(raw: string): BookingInquiryStatus {
  const s = raw.toLowerCase();
  if (
    s === "new" ||
    s === "contacted" ||
    s === "quote_sent" ||
    s === "awaiting_customer" ||
    s === "converted" ||
    s === "lost"
  ) {
    return s as BookingInquiryStatus;
  }
  return "new";
}

export async function fetchInquiriesPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  role: UserRole | null,
): Promise<InquiriesPageData> {
  const canManageInquiries = canManageBookings(role);

  const { data: properties, error: pErr } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: rawList, error: iErr } = await supabase
    .from("booking_inquiries")
    .select(
      "id, customer_id, property_id, event_type, fest_type, preferred_event_date, preferred_event_end_date, guest_count, estimated_total, status, next_follow_up_at, internal_notes, converted_booking_id, converted_at, updated_at, customers(name, phone, email), properties(name)",
    )
    .eq("organization_id", orgId)
    .is("converted_booking_id", null)
    .neq("status", "converted")
    .order("updated_at", { ascending: false });

  const loadError = pErr?.message ?? cErr?.message ?? iErr?.message ?? null;

  const inquiries: InquiryListRow[] = (rawList ?? [])
    .map((row) => {
      const r = row as unknown as RawInquiry;
      const ymd = (x: string | null | undefined) =>
        x && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null;
      return {
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customers?.name?.trim() || "Ukjent kunde",
        customerPhone: r.customers?.phone ?? null,
        customerEmail: r.customers?.email ?? null,
        propertyId: r.property_id,
        propertyName: r.properties?.name ?? null,
        eventType: r.event_type?.trim() || "Privat",
        festType: r.fest_type,
        preferredEventDateIso: ymd(r.preferred_event_date),
        preferredEventEndDateIso: ymd(r.preferred_event_end_date),
        guestCount: Number(r.guest_count) || 0,
        estimatedTotal:
          r.estimated_total != null ? Number(r.estimated_total) : null,
        status: normalizeInquiryStatus(r.status),
        nextFollowUpAtIso: r.next_follow_up_at,
        internalNotes: r.internal_notes,
        convertedBookingId: r.converted_booking_id,
        convertedAtIso: r.converted_at,
        updatedAtIso: r.updated_at,
      };
    })
    .filter(isActiveInquiry);

  return {
    inquiries,
    properties: properties ?? [],
    customers: customers ?? [],
    canManageInquiries,
    loadError,
  };
}
