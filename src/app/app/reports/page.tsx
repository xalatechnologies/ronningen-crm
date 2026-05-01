import { ReportsSection } from "@/components/reports/reports-section";
import type {
  EventTypeBreakdown,
  MonthlyRevenuePoint,
  ReportsKpis,
  UpcomingBookingRow,
} from "@/components/reports/types";
import { normalizeBookingAudience } from "@/lib/booking-audience";
import { isIncomeTransactionType } from "@/lib/transaction-income";
import { fetchAllTransactionsInDateRange } from "@/lib/supabase/fetch-transactions-in-range";
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
};

type RawTx = {
  type: string;
  amount: number;
  transaction_date: string;
};

function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isCancelledStatus(status: string) {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

function lastYearSameDay(today: string): string {
  const d = new Date(`${today}T12:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  return toLocalYmd(d);
}

function pctDelta(prev: number, curr: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)
  ).toUpperCase();
}

function normalizeStatus(
  s: string,
): "confirmed" | "pending" | "cancelled" {
  const x = s.toLowerCase();
  if (x === "confirmed" || x === "bekreftet") return "confirmed";
  if (x === "cancelled" || x === "avbestilt") return "cancelled";
  return "pending";
}

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();

  const reportYear = new Date().getFullYear();
  const todayIso = toLocalYmd(new Date());
  const yearStart = `${reportYear}-01-01`;
  const prevYear = reportYear - 1;
  const prevYearStart = `${prevYear}-01-01`;
  const prevYearEnd = lastYearSameDay(todayIso);

  const [bookingsRes, txRange] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, event_type, event_date, total_price, paid_amount, remaining_amount, status, customers(name)",
      )
      .order("event_date", { ascending: false }),
    fetchAllTransactionsInDateRange(supabase, prevYearStart, todayIso),
  ]);

  const loadError =
    bookingsRes.error?.message ?? txRange.error ?? null;

  const rawBookings = (bookingsRes.data ?? []) as unknown as RawBooking[];
  const rawTx = txRange.data as unknown as RawTx[];

  const activeBookings = rawBookings.filter(
    (b) => !isCancelledStatus(b.status),
  );

  let totalBooked = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;
  for (const b of activeBookings) {
    totalBooked += Number(b.total_price);
    totalPaid += Number(b.paid_amount);
    totalUnpaid += Number(b.remaining_amount);
  }

  const paidShare = totalBooked > 0 ? totalPaid / totalBooked : 0;
  const unpaidShareOfBooked = totalBooked > 0 ? totalUnpaid / totalBooked : 0;

  let revenueYtd = 0;
  let revenuePrevYtd = 0;
  for (const t of rawTx) {
    if (!isIncomeTransactionType(t.type)) continue;
    const amt = Number(t.amount);
    const d = t.transaction_date;
    if (d >= yearStart && d <= todayIso) {
      revenueYtd += amt;
    }
    if (d >= prevYearStart && d <= prevYearEnd) {
      revenuePrevYtd += amt;
    }
  }

  for (const b of activeBookings) {
    const d = b.event_date;
    const paid = Number(b.paid_amount);
    if (paid <= 0) continue;
    if (d >= yearStart && d <= todayIso) {
      revenueYtd += paid;
    }
    if (d >= prevYearStart && d <= prevYearEnd) {
      revenuePrevYtd += paid;
    }
  }

  let confirmedBookingCount = 0;
  let pendingBookingCount = 0;
  for (const b of activeBookings) {
    const s = normalizeStatus(b.status);
    if (s === "confirmed") confirmedBookingCount += 1;
    else if (s === "pending") pendingBookingCount += 1;
  }

  const kpis: ReportsKpis = {
    revenueYtd,
    revenueTrendPct: pctDelta(revenuePrevYtd, revenueYtd),
    totalBooked,
    totalPaid,
    totalUnpaid,
    bookingCount: activeBookings.length,
    confirmedBookingCount,
    pendingBookingCount,
    paidShare,
    unpaidShareOfBooked,
  };

  const monthAmounts = new Map<number, number>();
  for (let m = 1; m <= 12; m++) monthAmounts.set(m, 0);

  for (const t of rawTx) {
    if (!isIncomeTransactionType(t.type)) continue;
    const d = t.transaction_date;
    if (!d.startsWith(String(reportYear))) continue;
    const month = Number(d.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthAmounts.set(month, (monthAmounts.get(month) ?? 0) + Number(t.amount));
    }
  }

  for (const b of activeBookings) {
    const d = b.event_date;
    if (!d.startsWith(String(reportYear))) continue;
    const paid = Number(b.paid_amount);
    if (paid <= 0) continue;
    const month = Number(d.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthAmounts.set(month, (monthAmounts.get(month) ?? 0) + paid);
    }
  }

  const monthlyRevenue: MonthlyRevenuePoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const label = new Intl.DateTimeFormat("nb-NO", { month: "short" }).format(
      new Date(reportYear, m - 1, 1),
    );
    monthlyRevenue.push({
      monthIndex: m,
      label,
      amount: monthAmounts.get(m) ?? 0,
    });
  }

  let bedriftCount = 0;
  let privatCount = 0;
  for (const b of activeBookings) {
    if (normalizeBookingAudience(b.event_type) === "Bedrift") {
      bedriftCount += 1;
    } else {
      privatCount += 1;
    }
  }
  const eventTotal = activeBookings.length;
  const eventBreakdown: EventTypeBreakdown[] = [
    {
      eventType: "Bedrift",
      count: bedriftCount,
      pct: eventTotal > 0 ? (bedriftCount / eventTotal) * 100 : 0,
    },
    {
      eventType: "Privat",
      count: privatCount,
      pct: eventTotal > 0 ? (privatCount / eventTotal) * 100 : 0,
    },
  ];

  const upcoming: UpcomingBookingRow[] = activeBookings
    .filter((b) => b.event_date >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      customerName: b.customers?.name ?? "Ukjent kunde",
      initials: initialsFromName(b.customers?.name ?? ""),
      eventDate: b.event_date,
      status: normalizeStatus(b.status),
    }));

  return (
    <ReportsSection
      kpis={kpis}
      monthlyRevenue={monthlyRevenue}
      eventBreakdown={eventBreakdown}
      upcoming={upcoming}
      reportYear={reportYear}
      loadError={loadError}
    />
  );
}
