import type {
  BookingListContract,
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
import { effectiveBookingPaymentStatus } from "@/constants/booking-payment-status";
import { normalizeBookingAudience } from "@/lib/booking-audience";
import { formatBookingListDateLabel } from "@/lib/booking-period";
import { sortBookingsByUpcomingFirst } from "@/lib/bookings/list-sort";
import type { ContractStatus } from "@/lib/contracts/types";
import { CONTRACT_STATUSES } from "@/lib/contracts/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import { canManageBookings } from "@/lib/role-access";
import type { UserRole } from "@/constants/roles";

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
  property_id: string | null;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
};

export type BookingsPageData = {
  bookings: BookingListRow[];
  loadError: string | null;
  canDeleteBookings: boolean;
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

function isContractStatus(value: string): value is ContractStatus {
  return (CONTRACT_STATUSES as readonly string[]).includes(value);
}

export function summarizeBookingContract(
  versions: { id: string; status: string; version_number: number }[],
): BookingListContract | null {
  if (!versions.length) return null;
  const ordered = [...versions].sort((a, b) => b.version_number - a.version_number);
  const accepted = ordered.find((row) => row.status === "accepted");
  const current = accepted ?? ordered[0];
  if (!current || !isContractStatus(current.status)) return null;
  return { versionId: current.id, status: current.status };
}

async function loadContractsByBookingId(
  supabase: TenantSupabaseClient,
  orgId: string,
  bookingIds: string[],
): Promise<Map<string, BookingListContract>> {
  const byBooking = new Map<string, BookingListContract>();
  if (!bookingIds.length) return byBooking;

  const { data: contracts, error: contractError } = await supabase
    .from("rental_contracts" as never)
    .select("id, booking_id")
    .eq("organization_id", orgId)
    .in("booking_id", bookingIds);
  if (contractError || !contracts?.length) return byBooking;

  const rows = contracts as { id: string; booking_id: string }[];
  const contractIds = rows.map((row) => row.id);
  const bookingByContract = new Map(rows.map((row) => [row.id, row.booking_id]));

  const { data: versions, error: versionError } = await supabase
    .from("rental_contract_versions" as never)
    .select("id, contract_id, status, version_number")
    .in("contract_id", contractIds);
  if (versionError || !versions?.length) return byBooking;

  const grouped = new Map<string, { id: string; status: string; version_number: number }[]>();
  for (const version of versions as {
    id: string;
    contract_id: string;
    status: string;
    version_number: number;
  }[]) {
    const list = grouped.get(version.contract_id) ?? [];
    list.push(version);
    grouped.set(version.contract_id, list);
  }

  for (const [contractId, list] of grouped) {
    const bookingId = bookingByContract.get(contractId);
    const summary = summarizeBookingContract(list);
    if (bookingId && summary) byBooking.set(bookingId, summary);
  }
  return byBooking;
}

export async function fetchBookingsPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  role: UserRole | null,
): Promise<BookingsPageData> {
  const canDeleteBookings = canManageBookings(role);

  const { data: rawList, error } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, event_type, event_date, event_end_date, event_start_time, event_end_time, guest_count, total_price, paid_amount, remaining_amount, status, fest_type, notes, booking_reference, payment_due_date, collection_notice_sent_at, payment_status, property_id, customers(name, phone, email, address)",
    )
    .eq("organization_id", orgId)
    .order("event_date", { ascending: true });

  const loadError = error?.message ?? null;
  const contractsByBooking = await loadContractsByBookingId(
    supabase,
    orgId,
    (rawList ?? []).map((row) => (row as { id: string }).id),
  );

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
      propertyId: r.property_id,
      contract: contractsByBooking.get(r.id) ?? null,
    };
  });

  return {
    bookings: sortBookingsByUpcomingFirst(bookings),
    loadError,
    canDeleteBookings,
  };
}
