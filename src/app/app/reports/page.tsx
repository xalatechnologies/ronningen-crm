import { ReportsSection } from "@/components/reports/reports-section";
import {
  REPORTS_CALENDAR_MIN_YEAR,
  type EventTypeBreakdown,
  type MonthlyRevenuePoint,
  type ReportsFacilityStats,
  type ReportsKpis,
} from "@/components/reports/types";
import { normalizeBookingAudience } from "@/lib/booking-audience";
import {
  assetRowInsuranceIsCovered,
  assetStatusBucket,
} from "@/lib/asset-status-bucket";
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

type RawAssetAgg = {
  value: number;
  condition: string | null;
  insurance_status: string | null;
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

/** Kanonisk YYYY-MM-DD (stabile sammenligninger og støtte for u-paddede datoer). */
function toComparableYmd(s: string | null | undefined): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) {
    const y = m[1];
    const mo = String(Number(m[2])).padStart(2, "0");
    const da = String(Number(m[3])).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalYmd(d);
}

function isCancelledStatus(status: string) {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

function lastDayOfMonthYmd(y: number, month1to12: number): string {
  return toLocalYmd(new Date(y, month1to12, 0));
}

function sameDayPreviousYearYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  return toLocalYmd(d);
}

function pctDelta(prev: number, curr: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function normalizeStatus(
  s: string,
): "confirmed" | "pending" | "cancelled" {
  const x = s.toLowerCase();
  if (x === "confirmed" || x === "bekreftet") return "confirmed";
  if (x === "cancelled" || x === "avbestilt") return "cancelled";
  return "pending";
}

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const supabase = await createServerSupabaseClient();

  const sp = await searchParams;
  const calendarYearMax = new Date().getFullYear();
  const parsedYear = Number.parseInt(sp.year ?? "", 10);
  const reportYear =
    Number.isFinite(parsedYear) &&
    parsedYear >= REPORTS_CALENDAR_MIN_YEAR &&
    parsedYear <= calendarYearMax
      ? parsedYear
      : calendarYearMax;

  const parsedMonth = Number.parseInt(sp.month ?? "", 10);
  const focusMonth =
    Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : null;

  const reportYearEndYmd = `${reportYear}-12-31`;
  const yearStart = `${reportYear}-01-01`;
  const prevYear = reportYear - 1;
  const prevYearStart = `${prevYear}-01-01`;

  let periodStart: string;
  let periodEnd: string;
  let prevPeriodStart: string;
  let prevPeriodEnd: string;

  if (focusMonth != null) {
    const m = String(focusMonth).padStart(2, "0");
    periodStart = `${reportYear}-${m}-01`;
    periodEnd = lastDayOfMonthYmd(reportYear, focusMonth);
    prevPeriodStart = sameDayPreviousYearYmd(periodStart);
    prevPeriodEnd = sameDayPreviousYearYmd(periodEnd);
  } else {
    periodStart = yearStart;
    periodEnd = reportYearEndYmd;
    prevPeriodStart = prevYearStart;
    prevPeriodEnd = `${prevYear}-12-31`;
  }

  const reportsPeriodLabel =
    focusMonth != null
      ? new Intl.DateTimeFormat("nb-NO", {
          month: "long",
          year: "numeric",
        }).format(new Date(reportYear, focusMonth - 1, 1))
      : String(reportYear);

  const [bookingsRes, txRange, assetsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, event_type, event_date, total_price, paid_amount, remaining_amount, status, customers(name)",
      )
      .order("event_date", { ascending: false }),
    fetchAllTransactionsInDateRange(supabase, prevYearStart, reportYearEndYmd),
    supabase
      .from("assets")
      .select("value, condition, insurance_status")
      .limit(10_000),
  ]);

  const loadError =
    bookingsRes.error?.message ??
    txRange.error ??
    assetsRes.error?.message ??
    null;

  const rawBookings = (bookingsRes.data ?? []) as unknown as RawBooking[];
  const rawTx = txRange.data as unknown as RawTx[];
  const rawAssets = (assetsRes.data ?? []) as unknown as RawAssetAgg[];

  let assetOperationalCount = 0;
  let assetMaintenanceCount = 0;
  let assetReplaceCount = 0;
  let assetInsuredLineCount = 0;
  let assetInsuredValueNok = 0;
  let assetUninsuredLineCount = 0;
  let assetUninsuredValueNok = 0;
  for (const r of rawAssets) {
    const v = Number(r.value);
    const b = assetStatusBucket(r.condition);
    if (b === "operational") assetOperationalCount += 1;
    else if (b === "maintenance") assetMaintenanceCount += 1;
    else assetReplaceCount += 1;
    if (assetRowInsuranceIsCovered(r.insurance_status)) {
      assetInsuredLineCount += 1;
      assetInsuredValueNok += v;
    } else {
      assetUninsuredLineCount += 1;
      assetUninsuredValueNok += v;
    }
  }

  const facility: ReportsFacilityStats = {
    assetOperationalCount,
    assetMaintenanceCount,
    assetReplaceCount,
    assetInsuredLineCount,
    assetInsuredValueNok,
    assetUninsuredLineCount,
    assetUninsuredValueNok,
  };

  const activeBookings = rawBookings.filter(
    (b) => !isCancelledStatus(b.status),
  );

  const periodScopedBookings = activeBookings.filter((b) => {
    const d = toComparableYmd(b.event_date);
    if (!d) return false;
    return d >= periodStart && d <= periodEnd;
  });

  let totalBooked = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;
  for (const b of periodScopedBookings) {
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
    const d = toComparableYmd(t.transaction_date);
    if (!d) continue;
    if (d >= periodStart && d <= periodEnd) {
      revenueYtd += amt;
    }
    if (d >= prevPeriodStart && d <= prevPeriodEnd) {
      revenuePrevYtd += amt;
    }
  }

  for (const b of activeBookings) {
    const d = toComparableYmd(b.event_date);
    if (!d) continue;
    const paid = Number(b.paid_amount);
    if (paid <= 0) continue;
    if (d >= periodStart && d <= periodEnd) {
      revenueYtd += paid;
    }
    if (d >= prevPeriodStart && d <= prevPeriodEnd) {
      revenuePrevYtd += paid;
    }
  }

  let confirmedBookingCount = 0;
  let pendingBookingCount = 0;
  for (const b of periodScopedBookings) {
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
    bookingCount: periodScopedBookings.length,
    confirmedBookingCount,
    pendingBookingCount,
    paidShare,
    unpaidShareOfBooked,
  };

  const monthAmounts = new Map<number, number>();
  for (let m = 1; m <= 12; m++) monthAmounts.set(m, 0);

  if (focusMonth != null) {
    let monthTotal = 0;
    for (const t of rawTx) {
      if (!isIncomeTransactionType(t.type)) continue;
      const d = toComparableYmd(t.transaction_date);
      if (!d || d < periodStart || d > periodEnd) continue;
      monthTotal += Number(t.amount);
    }
    for (const b of activeBookings) {
      const d = toComparableYmd(b.event_date);
      if (!d || d < periodStart || d > periodEnd) continue;
      const paid = Number(b.paid_amount);
      if (paid <= 0) continue;
      monthTotal += paid;
    }
    monthAmounts.set(focusMonth, monthTotal);
  } else {
    for (const t of rawTx) {
      if (!isIncomeTransactionType(t.type)) continue;
      const d = toComparableYmd(t.transaction_date);
      if (!d || !d.startsWith(String(reportYear))) continue;
      const month = Number(d.slice(5, 7));
      if (month >= 1 && month <= 12) {
        monthAmounts.set(
          month,
          (monthAmounts.get(month) ?? 0) + Number(t.amount),
        );
      }
    }

    for (const b of activeBookings) {
      const d = toComparableYmd(b.event_date);
      if (!d || d < yearStart || d > reportYearEndYmd) continue;
      const paid = Number(b.paid_amount);
      if (paid <= 0) continue;
      const month = Number(d.slice(5, 7));
      if (month >= 1 && month <= 12) {
        monthAmounts.set(month, (monthAmounts.get(month) ?? 0) + paid);
      }
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
  for (const b of periodScopedBookings) {
    if (normalizeBookingAudience(b.event_type) === "Bedrift") {
      bedriftCount += 1;
    } else {
      privatCount += 1;
    }
  }
  const eventTotal = periodScopedBookings.length;
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

  return (
    <ReportsSection
      kpis={kpis}
      monthlyRevenue={monthlyRevenue}
      eventBreakdown={eventBreakdown}
      facility={facility}
      reportYear={reportYear}
      calendarYearMax={calendarYearMax}
      focusMonth={focusMonth}
      reportsPeriodLabel={reportsPeriodLabel}
      loadError={loadError}
    />
  );
}
