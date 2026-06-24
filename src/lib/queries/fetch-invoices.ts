import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import {
  effectiveBookingPaymentStatus,
  hideFromOutstandingInvoices,
} from "@/constants/booking-payment-status";
import { sortInvoicesByUrgency } from "@/lib/invoice-row-utils";
import { formatBookingListDateLabel } from "@/lib/booking-period";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import { canManageFinance } from "@/lib/role-access";
import type { UserRole } from "@/constants/roles";

type RawBooking = {
  id: string;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
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
  properties: { name: string } | null;
};

function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type InvoicesPageData = {
  rows: UnpaidInvoiceRow[];
  loadError: string | null;
  canMarkInvoicesPaid: boolean;
};

export async function fetchInvoicesPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  role: UserRole | null,
): Promise<InvoicesPageData> {
  const canMarkInvoicesPaid = canManageFinance(role);
  const todayYmd = toLocalYmd(new Date());

  const { data: rawList, error } = await supabase
    .from("bookings")
    .select(
      "id, event_type, event_date, event_end_date, event_start_time, event_end_time, total_price, paid_amount, remaining_amount, status, booking_reference, payment_due_date, collection_notice_sent_at, payment_status, customers(name, phone, email, address), properties(name)",
    )
    .eq("organization_id", orgId)
    .gt("remaining_amount", 0)
    .not("status", "in", '("cancelled","avbestilt")')
    .order("event_date", { ascending: true });

  const loadError = error?.message ?? null;

  const rowsUnsorted: UnpaidInvoiceRow[] = (rawList ?? [])
    .map((row) => row as unknown as RawBooking)
    .filter((r) => !hideFromOutstandingInvoices(r.payment_status))
    .map((r) => {
      const name = r.customers?.name?.trim() || "Ukjent kunde";
      const totalNok = Number(r.total_price);
      const paidNok = Number(r.paid_amount);
      const remainingNok = Number(r.remaining_amount);
      return {
        id: r.id,
        customerName: name,
        customerEmail: r.customers?.email ?? null,
        customerPhone: r.customers?.phone ?? null,
        customerAddress: r.customers?.address ?? null,
        eventDateIso: r.event_date,
        eventDateLabel: formatBookingListDateLabel({
          eventDateIso: r.event_date,
          eventEndDateIso: r.event_end_date,
          eventStartTime: r.event_start_time,
          eventEndTime: r.event_end_time,
        }),
        eventType: r.event_type?.trim() || "Arrangement",
        paymentDueDateIso: r.payment_due_date ?? null,
        collectionNoticeSentAt: r.collection_notice_sent_at ?? null,
        paymentStatus: effectiveBookingPaymentStatus(
          r.payment_status,
          totalNok,
          paidNok,
          remainingNok,
        ),
        totalNok,
        paidNok,
        remainingNok,
        bookingReference: r.booking_reference,
        propertyName: r.properties?.name ?? null,
      };
    });

  const rows = sortInvoicesByUrgency(rowsUnsorted, todayYmd);

  return { rows, loadError, canMarkInvoicesPaid };
}
