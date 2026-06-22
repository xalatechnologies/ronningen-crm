import {
  REPORTS_CALENDAR_MIN_YEAR,
  type EventTypeBreakdown,
  type FestTypeBreakdown,
  type MonthlyRevenuePoint,
  type ReportsFacilityStats,
  type ReportsKpis,
} from "@/components/reports/types";
import {
  assetRowInsuranceIsCovered,
  assetStatusBucket,
} from "@/lib/asset-status-bucket";
import {
  aggregateAccommodation,
  aggregateBookingMoney,
  aggregateInquiries,
  buildEventAudienceBreakdown,
  buildFestTypeBreakdown,
  buildMonthlyInvoicedSeries,
  computeFakturertTrendPct,
  lastDayOfMonthYmd,
  sameDayPreviousYearYmd,
  type ReportAccommodationRow,
  type ReportBookingRow,
  type ReportInquiryRow,
} from "@/lib/reports/tenant-report-metrics";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type RawAssetAgg = {
  value: number;
  condition: string | null;
  insurance_status: string | null;
};

export type ReportsPageData = {
  kpis: ReportsKpis;
  monthlyRevenue: MonthlyRevenuePoint[];
  eventBreakdown: EventTypeBreakdown[];
  festTypeBreakdown: FestTypeBreakdown[];
  facility: ReportsFacilityStats;
  reportYear: number;
  calendarYearMax: number;
  focusMonth: number | null;
  reportsPeriodLabel: string;
  loadError: string | null;
  hasRegisteredActivity: boolean;
};

export function resolveReportsParams(sp: {
  year?: string;
  month?: string;
}) {
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

  return { reportYear, focusMonth, calendarYearMax };
}

export async function fetchReportsPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  reportYear: number,
  focusMonth: number | null,
  calendarYearMax: number,
): Promise<ReportsPageData> {
  const reportYearEndYmd = `${reportYear}-12-31`;
  const yearStart = `${reportYear}-01-01`;
  const prevYear = reportYear - 1;

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
    prevPeriodStart = `${prevYear}-01-01`;
    prevPeriodEnd = `${prevYear}-12-31`;
  }

  const period = { startYmd: periodStart, endYmd: periodEnd };
  const prevPeriod = { startYmd: prevPeriodStart, endYmd: prevPeriodEnd };

  const reportsPeriodLabel =
    focusMonth != null
      ? new Intl.DateTimeFormat("nb-NO", {
          month: "long",
          year: "numeric",
        }).format(new Date(reportYear, focusMonth - 1, 1))
      : String(reportYear);

  const [bookingsRes, inquiriesRes, accommodationsRes, assetsRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, event_type, fest_type, event_date, event_end_date, total_price, paid_amount, remaining_amount, status",
        )
        .eq("organization_id", orgId)
        .order("event_date", { ascending: false }),
      supabase
        .from("booking_inquiries")
        .select(
          "status, estimated_total, preferred_event_date, created_at, converted_booking_id",
        )
        .eq("organization_id", orgId),
      supabase
        .from("accommodation_reservations")
        .select("status, total_price, check_in_date, check_out_date")
        .eq("organization_id", orgId),
      supabase
        .from("assets")
        .select("value, condition, insurance_status")
        .eq("organization_id", orgId)
        .limit(10_000),
    ]);

  const loadError =
    bookingsRes.error?.message ??
    inquiriesRes.error?.message ??
    accommodationsRes.error?.message ??
    assetsRes.error?.message ??
    null;

  const rawBookings = (bookingsRes.data ?? []) as unknown as ReportBookingRow[];
  const rawInquiries = (inquiriesRes.data ?? []) as unknown as ReportInquiryRow[];
  const rawAccommodations = (accommodationsRes.data ??
    []) as unknown as ReportAccommodationRow[];
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

  const bookingAgg = aggregateBookingMoney(rawBookings, period);
  const prevBookingAgg = aggregateBookingMoney(rawBookings, prevPeriod);
  const accommodationAgg = aggregateAccommodation(rawAccommodations, period);
  const prevAccommodationAgg = aggregateAccommodation(
    rawAccommodations,
    prevPeriod,
  );
  const inquiryAgg = aggregateInquiries(rawInquiries, period);

  const totalBooked =
    bookingAgg.totalBooked + accommodationAgg.totalBookedNok;
  const prevTotalBooked =
    prevBookingAgg.totalBooked + prevAccommodationAgg.totalBookedNok;

  const paidShare =
    totalBooked > 0 ? bookingAgg.totalPaid / totalBooked : 0;
  const unpaidShareOfBooked =
    totalBooked > 0 ? bookingAgg.totalUnpaid / totalBooked : 0;

  const kpis: ReportsKpis = {
    revenueYtd: totalBooked,
    revenueTrendPct: computeFakturertTrendPct(totalBooked, prevTotalBooked),
    totalBooked,
    totalPaid: bookingAgg.totalPaid,
    totalUnpaid: bookingAgg.totalUnpaid,
    bookingCount: bookingAgg.bookingCount,
    confirmedBookingCount: bookingAgg.confirmedBookingCount,
    pendingBookingCount: bookingAgg.pendingBookingCount,
    inquiryCount: inquiryAgg.activeCount,
    inquiryEstimatedTotal: inquiryAgg.estimatedTotalNok,
    accommodationCount: accommodationAgg.reservationCount,
    accommodationBookedNok: accommodationAgg.totalBookedNok,
    paidShare,
    unpaidShareOfBooked,
  };

  const monthAmounts = buildMonthlyInvoicedSeries({
    bookings: rawBookings,
    accommodations: rawAccommodations,
    reportYear,
    focusMonth,
    yearStartYmd: yearStart,
    yearEndYmd: reportYearEndYmd,
  });

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

  const eventBreakdown = buildEventAudienceBreakdown(rawBookings, period);
  const festTypeBreakdown = buildFestTypeBreakdown(rawBookings, period);

  const hasRegisteredActivity =
    rawBookings.length > 0 ||
    rawInquiries.some((i) => i.status !== "converted") ||
    rawAccommodations.length > 0 ||
    rawAssets.length > 0;

  return {
    kpis,
    monthlyRevenue,
    eventBreakdown,
    festTypeBreakdown,
    facility,
    reportYear,
    calendarYearMax,
    focusMonth,
    reportsPeriodLabel,
    loadError,
    hasRegisteredActivity,
  };
}
