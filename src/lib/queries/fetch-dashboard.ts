import type { DashboardHomeData } from "@/components/dashboard/types";
import {
  buildCalendarYearOptions,
  resolveCalendarYearMax,
  resolveCalendarYearMin,
} from "@/lib/calendar/year-range";
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
import type { TenantSupabaseClient } from "@/lib/queries/types";

type RawBooking = {
  id: string;
  event_type: string;
  event_date: string;
  event_end_date: string | null;
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

export async function fetchDashboardData(
  supabase: TenantSupabaseClient,
  orgId: string,
): Promise<DashboardHomeData> {
  const now = new Date();
  const today = startOfToday();
  const todayYmd = ymd(today);
  const windowEnd = addDays(today, 30);
  const windowEndYmd = ymd(windowEnd);

  const bookingMoneySelect =
    "id, event_type, event_date, event_end_date, total_price, paid_amount, remaining_amount, status";

  const [moneyRes, alertsRes, upcomingRes, propRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(bookingMoneySelect)
      .eq("organization_id", orgId),
    supabase
      .from("bookings")
      .select(
        "id, event_type, event_date, remaining_amount, status, customers(name)",
      )
      .eq("organization_id", orgId)
      .gt("remaining_amount", 0)
      .lte("event_date", todayYmd)
      .not("status", "in", '("cancelled","avbestilt")')
      .order("event_date", { ascending: true })
      .order("remaining_amount", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select(
        "id, event_type, event_date, status, customers(name), properties(name)",
      )
      .eq("organization_id", orgId)
      .gte("event_date", todayYmd)
      .lte("event_date", windowEndYmd)
      .not("status", "in", '("cancelled","avbestilt")')
      .order("event_date", { ascending: true })
      .limit(12),
    supabase.from("properties").select("id").eq("organization_id", orgId),
  ]);

  const loadError =
    [
      moneyRes.error?.message,
      alertsRes.error?.message,
      upcomingRes.error?.message,
      propRes.error?.message,
    ]
      .filter(Boolean)
      .join(" — ") || null;

  const rawBookings = (moneyRes.data ?? []) as unknown as RawBooking[];
  const chartBookings = rawBookings;
  const moneyRows = rawBookings.map((r) => ({
    total_price: Number(r.total_price),
    paid_amount: Number(r.paid_amount),
    remaining_amount: Number(r.remaining_amount),
    status: r.status,
    event_date: r.event_date,
  }));

  const { invoiced, paid, unpaid } = sumActiveBookingMoney(moneyRows);
  const invoicedDelta = invoicedMonthOverMonthDelta(moneyRows, now);
  const paidSharePct =
    invoiced > 0 ? (paid / invoiced) * 100 : null;
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

  let dataYearMin: number | null = null;
  let dataYearMax: number | null = null;
  for (const r of chartBookings) {
    const y = Number.parseInt(r.event_date.slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    dataYearMin = dataYearMin == null ? y : Math.min(dataYearMin, y);
    dataYearMax = dataYearMax == null ? y : Math.max(dataYearMax, y);
    if (r.event_end_date) {
      const endY = Number.parseInt(r.event_end_date.slice(0, 4), 10);
      if (Number.isFinite(endY)) {
        dataYearMin = Math.min(dataYearMin, endY);
        dataYearMax = Math.max(dataYearMax, endY);
      }
    }
  }

  const chartYears = buildCalendarYearOptions(
    resolveCalendarYearMin(now, dataYearMin),
    resolveCalendarYearMax(now, dataYearMax),
  );

  const monthlyByYear = buildMonthlyInvoicedByEventYear(
    chartBookings.map((r) => ({
      total_price: Number(r.total_price),
      paid_amount: Number(r.paid_amount),
      remaining_amount: Number(r.remaining_amount),
      status: r.status,
      event_date: r.event_date,
    })),
    chartYears,
  );

  const paymentAlerts = (alertsRes.data ?? [])
    .map((row) => row as unknown as RawBooking)
    .map((r) => {
      const name = r.customers?.name?.trim() || "Ukjent kunde";
      const type = r.event_type?.trim() || "Arrangement";
      return {
        bookingId: r.id,
        title: `${name} · ${type}`,
        amountNok: Number(r.remaining_amount),
        dueLabel: formatNbShortDate(r.event_date),
        status:
          r.event_date < todayYmd ? ("overdue" as const) : ("dueToday" as const),
      };
    });

  const upcoming = (upcomingRes.data ?? [])
    .map((row) => row as unknown as RawBooking)
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
