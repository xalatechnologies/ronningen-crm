import { BookingsList } from "@/components/bookings/bookings-list";
import type {
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
import { effectiveBookingPaymentStatus } from "@/constants/booking-payment-status";
import { normalizeBookingAudience } from "@/lib/booking-audience";
import { canManageBookings } from "@/lib/role-access";
import { formatBookingListDateLabel } from "@/lib/booking-period";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";

type RawBooking = {
  id: string;
  customer_id: string;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: number;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  fest_type: string | null;
  notes: string | null;
  booking_reference: string | null;
  payment_due_date: string | null;
  collection_notice_sent_at: string | null;
  payment_status: string | null;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

function isCancelledStatus(status: string) {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

function normalizeStatus(raw: string): BookingStatus {
  const x = raw.toLowerCase();
  if (x === "confirmed" || x === "bekreftet") return "confirmed";
  if (x === "cancelled" || x === "avbestilt") return "cancelled";
  return "pending";
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

function avatarClassForId(id: string) {
  const classes = [
    "bg-accent text-primary",
    "bg-muted text-secondary-foreground",
    "bg-rn-surface-gradient-from text-success",
  ] as const;
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return classes[h % classes.length]!;
}

function paidLabelAndFraction(
  total: number,
  paid: number,
  cancelled: boolean,
): { paidFraction: number | null; paidLabel: string } {
  if (cancelled) {
    return { paidFraction: null, paidLabel: "Avbestilt" };
  }
  if (total <= 0) {
    return { paidFraction: 1, paidLabel: "Betalt" };
  }
  const frac = Math.min(1, paid / total);
  const label =
    frac >= 0.999
      ? "Betalt"
      : `${new Intl.NumberFormat("nb-NO").format(Math.round(paid))} betalt`;
  return { paidFraction: frac, paidLabel: label };
}

export default async function BookingsPage() {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canDeleteBookings = canManageBookings(role);

  const { data: rawList, error } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, event_type, event_date, event_end_date, event_start_time, event_end_time, guest_count, total_price, paid_amount, remaining_amount, status, fest_type, notes, booking_reference, payment_due_date, collection_notice_sent_at, payment_status, customers(name, phone, email, address)",
    )
    .eq("organization_id", orgId)
    .order("event_date", { ascending: false });

  const loadError = error?.message ?? null;

  const bookings: BookingListRow[] = (rawList ?? []).map((row) => {
    const r = row as unknown as RawBooking;
    const cancelled = isCancelledStatus(r.status);
    const status = normalizeStatus(r.status);
    const name = r.customers?.name?.trim() || "Ukjent kunde";
    const eventTypeLabel = r.event_type?.trim() || "Annet";
    const total = Number(r.total_price);
    const paid = Number(r.paid_amount);
    const remaining = Number(r.remaining_amount);
    const { paidFraction, paidLabel } = paidLabelAndFraction(
      total,
      paid,
      cancelled,
    );

    return {
      id: r.id,
      customerId: r.customer_id,
      customer: name,
      customerPhone: r.customers?.phone ?? null,
      customerEmail: r.customers?.email ?? null,
      customerAddress: r.customers?.address ?? null,
      initials: initialsFromName(name),
      avatarClass: avatarClassForId(r.id),
      date: formatBookingListDateLabel({
        eventDateIso: r.event_date,
        eventEndDateIso: r.event_end_date,
        eventStartTime: r.event_start_time,
        eventEndTime: r.event_end_time,
      }),
      eventType: eventTypeLabel,
      guests: Number(r.guest_count),
      totalNok: total,
      paidNok: paid,
      remainingNok: remaining,
      paidFraction,
      paidLabel,
      status,
      dimmed: cancelled,
      eventDateIso: r.event_date,
      eventEndDateIso: r.event_end_date,
      eventStartTime: r.event_start_time,
      eventEndTime: r.event_end_time,
      festType: r.fest_type,
      bookingReference: r.booking_reference,
      notes: r.notes,
      eventTypeForm: normalizeBookingAudience(r.event_type),
      paymentDueDateIso: r.payment_due_date ?? null,
      collectionNoticeSentAt: r.collection_notice_sent_at ?? null,
      paymentStatus: effectiveBookingPaymentStatus(
        r.payment_status,
        total,
        paid,
        remaining,
      ),
    };
  });

  return (
    <BookingsList
      bookings={bookings}
      loadError={loadError}
      canDeleteBookings={canDeleteBookings}
    />
  );
}
