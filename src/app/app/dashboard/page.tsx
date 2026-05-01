import { DashboardHome } from "@/components/dashboard/dashboard-home";
import type {
  DashboardHomeData,
  DashboardPaymentAlert,
  DashboardUpcomingRow,
} from "@/components/dashboard/types";
import {
  addDays,
  buildMonthlyInvoicedByEventYear,
  countOverdueUnpaidBookings,
  invoicedMonthOverMonthDelta,
  isCancelledBookingStatus,
  normalizeDashboardBookingStatus,
  parseLocalDate,
  startOfToday,
  sumActiveBookingMoney,
  ymd,
} from "@/lib/dashboard-metrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RawBooking = {
  id: string;
  event_type: string;
  event_date: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  customers: { name: string } | null;
  properties: { name: string } | null;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

function formatNbShortDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(iso));
}

async function loadDashboardData(): Promise<DashboardHomeData> {
  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const chartYears = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()] as const;

  const [bookingsRes, propRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, event_type, event_date, total_price, paid_amount, remaining_amount, status, customers(name), properties(name)",
      ),
    supabase.from("properties").select("id"),
  ]);

  const loadError =
    [bookingsRes.error?.message, propRes.error?.message]
      .filter(Boolean)
      .join(" — ") || null;

  const rawBookings = (bookingsRes.data ?? []) as unknown as RawBooking[];
  const moneyRows = rawBookings.map((r) => ({
    total_price: Number(r.total_price),
    paid_amount: Number(r.paid_amount),
    remaining_amount: Number(r.remaining_amount),
    status: r.status,
    event_date: r.event_date,
  }));

  const { invoiced, paid, unpaid } = sumActiveBookingMoney(moneyRows);
  const invoicedDelta = invoicedMonthOverMonthDelta(moneyRows, now);
  const paidSharePct = invoiced > 0 ? (paid / invoiced) * 100 : null;
  const overdueUnpaidCount = countOverdueUnpaidBookings(
    moneyRows.map((r) => ({
      ...r,
      total_price: r.total_price,
      paid_amount: r.paid_amount,
      remaining_amount: r.remaining_amount,
      status: r.status,
      event_date: r.event_date,
    })),
  );

  const activeBookingCount = rawBookings.filter(
    (r) => !isCancelledBookingStatus(r.status),
  ).length;
  const propertyCount = propRes.data?.length ?? 0;

  const monthlyByYear = buildMonthlyInvoicedByEventYear(moneyRows, chartYears);

  const today = startOfToday();
  const todayYmd = ymd(today);
  const windowEnd = addDays(today, 30);
  const windowEndYmd = ymd(windowEnd);

  const paymentAlerts: DashboardPaymentAlert[] = rawBookings
    .filter((r) => !isCancelledBookingStatus(r.status))
    .filter((r) => Number(r.remaining_amount) > 0)
    .filter((r) => r.event_date <= todayYmd)
    .sort(
      (a, b) =>
        a.event_date.localeCompare(b.event_date) ||
        Number(b.remaining_amount) - Number(a.remaining_amount),
    )
    .slice(0, 5)
    .map((r) => {
      const name = r.customers?.name?.trim() || "Ukjent kunde";
      const type = r.event_type?.trim() || "Arrangement";
      return {
        bookingId: r.id,
        title: `${name} · ${type}`,
        amountNok: Number(r.remaining_amount),
        dueLabel: formatNbShortDate(r.event_date),
        status: r.event_date < todayYmd ? ("overdue" as const) : ("dueToday" as const),
      };
    });

  const upcoming: DashboardUpcomingRow[] = rawBookings
    .filter((r) => !isCancelledBookingStatus(r.status))
    .filter((r) => r.event_date >= todayYmd && r.event_date <= windowEndYmd)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 12)
    .map((r) => {
      const name = r.customers?.name?.trim() || "Ukjent kunde";
      const type = r.event_type?.trim() || "Arrangement";
      const venue = r.properties?.name?.trim() || "—";
      return {
        bookingId: r.id,
        dateLabel: formatNbShortDate(r.event_date),
        timeLabel: "Hele dagen",
        customer: name,
        initials: initialsFromName(name),
        type,
        venue,
        status: normalizeDashboardBookingStatus(r.status),
      };
    });

  return {
    loadError,
    kpis: {
      totalInvoicedNok: invoiced,
      totalPaidNok: paid,
      totalUnpaidNok: unpaid,
      invoicedMonthDeltaPct: invoicedDelta,
      paidShareOfInvoicedPct: paidSharePct,
      overdueUnpaidCount,
      activeBookingCount,
      propertyCount,
    },
    monthlyByYear,
    paymentAlerts,
    upcoming,
  };
}

export default async function DashboardPage() {
  const data = await loadDashboardData();
  return <DashboardHome data={data} />;
}
