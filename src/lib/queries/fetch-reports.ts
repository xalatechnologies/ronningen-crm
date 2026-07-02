import {
  type EventTypeBreakdown,
  type FestTypeBreakdown,
  type MonthlyRevenuePoint,
  type ReportsFacilityStats,
  type ReportsModuleKpis,
} from "@/components/reports/types";
import {
  deriveReportsYearBounds,
  getCurrentCalendarYear,
  isAllYearsReportParam,
  resolveReportYearFromParams,
} from "@/lib/reports/calendar-range";
import {
  assetRowInsuranceIsCovered,
  assetStatusBucket,
} from "@/lib/asset-status-bucket";
import { pctDelta } from "@/lib/dashboard-metrics";
import {
  aggregateAccommodation,
  aggregateBookingMoney,
  aggregateInquiryPipeline,
  aggregateOutstandingBookings,
  aggregateTransactions,
  buildEventAudienceBreakdown,
  buildFestTypeBreakdown,
  buildMonthlyInvoicedSeries,
  buildYearlyInvoicedSeries,
  computeFakturertTrendPct,
  countCustomersCreatedInPeriod,
  lastDayOfMonthYmd,
  sameDayPreviousYearYmd,
  type ReportAccommodationRow,
  type ReportBookingRow,
  type ReportCustomerRow,
  type ReportInquiryRow,
  type ReportTransactionRow,
} from "@/lib/reports/tenant-report-metrics";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type RawAssetAgg = {
  value: number;
  quantity: number;
  condition: string | null;
  insurance_status: string | null;
};

export type ReportsPageData = {
  kpis: ReportsModuleKpis;
  monthlyRevenue: MonthlyRevenuePoint[];
  eventBreakdown: EventTypeBreakdown[];
  festTypeBreakdown: FestTypeBreakdown[];
  facility: ReportsFacilityStats;
  reportYear: number;
  currentCalendarYear: number;
  calendarYearMin: number;
  calendarYearMax: number;
  focusMonth: number | null;
  allYears: boolean;
  reportsPeriodLabel: string;
  loadError: string | null;
  hasRegisteredActivity: boolean;
};

export function resolveReportsParams(sp: {
  year?: string;
  month?: string;
}) {
  const allYears = isAllYearsReportParam(sp.year);
  const reportYear = allYears
    ? getCurrentCalendarYear()
    : resolveReportYearFromParams(sp.year);

  const parsedMonth = Number.parseInt(sp.month ?? "", 10);
  const focusMonth =
    allYears
      ? null
      : Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : null;

  return { reportYear, focusMonth, allYears };
}

export async function fetchReportsPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  reportYear: number,
  focusMonth: number | null,
  allYears: boolean,
): Promise<ReportsPageData> {
  const reportYearEndYmd = `${reportYear}-12-31`;
  const yearStart = `${reportYear}-01-01`;
  const prevYear = reportYear - 1;
  const bookingsFetchStart = `${prevYear}-01-01`;

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

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, event_type, fest_type, event_date, event_end_date, total_price, paid_amount, remaining_amount, status",
    )
    .eq("organization_id", orgId);
  if (!allYears) {
    bookingsQuery = bookingsQuery
      .gte("event_date", bookingsFetchStart)
      .lte("event_date", reportYearEndYmd);
  }

  let inquiriesQuery = supabase
    .from("booking_inquiries")
    .select(
      "status, estimated_total, preferred_event_date, created_at, converted_booking_id, converted_at, updated_at",
    )
    .eq("organization_id", orgId);
  if (!allYears) {
    inquiriesQuery = inquiriesQuery
      .gte("created_at", `${bookingsFetchStart}T00:00:00`)
      .lte("created_at", `${reportYearEndYmd}T23:59:59`);
  }

  let accommodationsQuery = supabase
    .from("accommodation_reservations")
    .select("status, total_price, check_in_date, check_out_date")
    .eq("organization_id", orgId);
  if (!allYears) {
    accommodationsQuery = accommodationsQuery
      .gte("check_in_date", bookingsFetchStart)
      .lte("check_in_date", reportYearEndYmd);
  }

  let transactionsQuery = supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("organization_id", orgId);
  if (!allYears) {
    transactionsQuery = transactionsQuery
      .gte("transaction_date", bookingsFetchStart)
      .lte("transaction_date", reportYearEndYmd);
  }

  let customersQuery = supabase
    .from("customers")
    .select("created_at")
    .eq("organization_id", orgId);
  if (!allYears) {
    customersQuery = customersQuery
      .gte("created_at", `${bookingsFetchStart}T00:00:00`)
      .lte("created_at", `${reportYearEndYmd}T23:59:59`);
  }

  const reportsPeriodLabel = allYears
    ? ""
    : focusMonth != null
      ? new Intl.DateTimeFormat("nb-NO", {
          month: "long",
          year: "numeric",
        }).format(new Date(reportYear, focusMonth - 1, 1))
      : String(reportYear);

  const [
    bookingsRes,
    inquiriesRes,
    accommodationsRes,
    assetsRes,
    transactionsRes,
    customersRes,
    partnersRes,
    propertiesRes,
    packagesRes,
    servicesRes,
    bookingBoundsRes,
    accommodationBoundsRes,
  ] = await Promise.all([
    bookingsQuery.order("event_date", { ascending: false }),
    inquiriesQuery,
    accommodationsQuery,
    supabase
      .from("assets")
      .select("value, quantity, condition, insurance_status")
      .eq("organization_id", orgId)
      .limit(10_000),
    transactionsQuery,
    customersQuery,
    supabase.from("partners").select("id").eq("organization_id", orgId),
    supabase.from("properties").select("id").eq("organization_id", orgId),
    supabase.from("packages").select("id").eq("organization_id", orgId),
    supabase.from("services").select("id").eq("organization_id", orgId),
    supabase
      .from("bookings")
      .select("event_date, event_end_date, status")
      .eq("organization_id", orgId),
    supabase
      .from("accommodation_reservations")
      .select("check_in_date, check_out_date, status")
      .eq("organization_id", orgId),
  ]);

  const loadError =
    bookingsRes.error?.message ??
    inquiriesRes.error?.message ??
    accommodationsRes.error?.message ??
    assetsRes.error?.message ??
    transactionsRes.error?.message ??
    customersRes.error?.message ??
    partnersRes.error?.message ??
    propertiesRes.error?.message ??
    packagesRes.error?.message ??
    servicesRes.error?.message ??
    bookingBoundsRes.error?.message ??
    accommodationBoundsRes.error?.message ??
    null;

  const rawBookings = (bookingsRes.data ?? []) as unknown as ReportBookingRow[];
  const rawInquiries = (inquiriesRes.data ?? []) as unknown as ReportInquiryRow[];
  const rawAccommodations = (accommodationsRes.data ??
    []) as unknown as ReportAccommodationRow[];
  const rawAssets = (assetsRes.data ?? []) as unknown as RawAssetAgg[];
  const rawTransactions = (transactionsRes.data ??
    []) as unknown as ReportTransactionRow[];
  const rawCustomers = (customersRes.data ?? []) as unknown as ReportCustomerRow[];

  const { currentCalendarYear, calendarYearMin, calendarYearMax } =
    deriveReportsYearBounds({
      bookingDates: (bookingBoundsRes.data ?? [])
        .filter((row) => {
          const status = String(row.status ?? "").toLowerCase();
          return status !== "cancelled" && status !== "avbestilt";
        })
        .map((row) => ({
          start: String(row.event_date),
          end: row.event_end_date ? String(row.event_end_date) : null,
        })),
      accommodationDates: (accommodationBoundsRes.data ?? [])
        .filter((row) => {
          const status = String(row.status ?? "").toLowerCase();
          return (
            status !== "cancelled" &&
            status !== "avbestilt" &&
            status !== "canceled"
          );
        })
        .map((row) => ({
          start: String(row.check_in_date),
          end: row.check_out_date ? String(row.check_out_date) : null,
        })),
    });
  const pickerYearMin = Math.min(calendarYearMin, reportYear);
  const pickerYearMax = Math.max(calendarYearMax, reportYear);

  const activePeriod = allYears
    ? {
        startYmd: `${pickerYearMin}-01-01`,
        endYmd: `${pickerYearMax}-12-31`,
      }
    : period;
  const activePrevPeriod = allYears
    ? { startYmd: "1970-01-01", endYmd: "1970-01-01" }
    : prevPeriod;

  let assetTotalValueNok = 0;
  let assetTotalUnits = 0;
  let assetOperationalCount = 0;
  let assetMaintenanceCount = 0;
  let assetReplaceCount = 0;
  let assetInsuredLineCount = 0;
  let assetInsuredValueNok = 0;
  let assetUninsuredLineCount = 0;
  let assetUninsuredValueNok = 0;
  for (const r of rawAssets) {
    const v = Number(r.value);
    assetTotalValueNok += v;
    assetTotalUnits += Number(r.quantity);
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
    assetTotalValueNok,
    assetRowCount: rawAssets.length,
    assetTotalUnits,
    assetOperationalCount,
    assetMaintenanceCount,
    assetReplaceCount,
    assetInsuredLineCount,
    assetInsuredValueNok,
    assetUninsuredLineCount,
    assetUninsuredValueNok,
  };

  const bookingAgg = aggregateBookingMoney(rawBookings, activePeriod);
  const prevBookingAgg = aggregateBookingMoney(rawBookings, activePrevPeriod);
  const accommodationAgg = aggregateAccommodation(rawAccommodations, activePeriod);
  const prevAccommodationAgg = aggregateAccommodation(
    rawAccommodations,
    activePrevPeriod,
  );
  const inquiryPipeline = aggregateInquiryPipeline(rawInquiries, activePeriod);
  const financeAgg = aggregateTransactions(rawTransactions, activePeriod);
  const prevFinanceAgg = aggregateTransactions(rawTransactions, activePrevPeriod);
  const outstandingAgg = aggregateOutstandingBookings(rawBookings);

  const fakturertNok =
    bookingAgg.totalBooked + accommodationAgg.totalBookedNok;
  const prevFakturertNok =
    prevBookingAgg.totalBooked + prevAccommodationAgg.totalBookedNok;

  const bookingBookedTotal = bookingAgg.totalBooked;
  const paidShare =
    bookingBookedTotal > 0 ? bookingAgg.totalPaid / bookingBookedTotal : 0;
  const unpaidShareOfBooked =
    bookingBookedTotal > 0
      ? bookingAgg.totalUnpaid / bookingBookedTotal
      : 0;

  const customerCount = rawCustomers.length;
  const newCustomersInPeriod = countCustomersCreatedInPeriod(
    rawCustomers,
    activePeriod,
  );
  const partnerCount = partnersRes.data?.length ?? 0;
  const propertyCount = propertiesRes.data?.length ?? 0;
  const packageCount = packagesRes.data?.length ?? 0;
  const serviceCount = servicesRes.data?.length ?? 0;

  const kpis: ReportsModuleKpis = {
    revenue: {
      fakturertNok,
      revenueTrendPct: allYears
        ? null
        : computeFakturertTrendPct(fakturertNok, prevFakturertNok),
      bookingFakturertNok: bookingAgg.totalBooked,
      accommodationFakturertNok: accommodationAgg.totalBookedNok,
      totalPaid: bookingAgg.totalPaid,
      totalUnpaid: bookingAgg.totalUnpaid,
      paidShare,
      unpaidShareOfBooked,
    },
    bookings: {
      bookingCount: bookingAgg.bookingCount,
      confirmedBookingCount: bookingAgg.confirmedBookingCount,
      pendingBookingCount: bookingAgg.pendingBookingCount,
    },
    inquiries: {
      openCount: inquiryPipeline.openCount,
      estimatedNok: inquiryPipeline.estimatedNok,
      convertedCount: inquiryPipeline.convertedCount,
      lostCount: inquiryPipeline.lostCount,
      conversionRatePct: inquiryPipeline.conversionRatePct,
    },
    accommodation: {
      reservationCount: accommodationAgg.reservationCount,
      fakturertNok: accommodationAgg.totalBookedNok,
    },
    finance: {
      incomeNok: financeAgg.incomeNok,
      expenseNok: financeAgg.expenseNok,
      netNok: financeAgg.netNok,
      incomeTrendPct: allYears
        ? null
        : pctDelta(prevFinanceAgg.incomeNok, financeAgg.incomeNok),
      expenseTrendPct: allYears
        ? null
        : pctDelta(prevFinanceAgg.expenseNok, financeAgg.expenseNok),
    },
    invoices: {
      outstandingNok: outstandingAgg.outstandingNok,
      overdueUnpaidCount: outstandingAgg.overdueUnpaidCount,
    },
    partners: {
      customerCount,
      newCustomersInPeriod,
      partnerCount,
      propertyCount,
    },
    pricing: {
      packageCount,
      serviceCount,
    },
  };

  let monthlyRevenue: MonthlyRevenuePoint[] = [];

  if (allYears) {
    const yearAmounts = buildYearlyInvoicedSeries({
      bookings: rawBookings,
      accommodations: rawAccommodations,
      yearMin: pickerYearMin,
      yearMax: pickerYearMax,
    });
    for (let y = pickerYearMin; y <= pickerYearMax; y++) {
      monthlyRevenue.push({
        monthIndex: y,
        label: String(y),
        amount: yearAmounts.get(y) ?? 0,
      });
    }
  } else {
    const monthAmounts = buildMonthlyInvoicedSeries({
      bookings: rawBookings,
      accommodations: rawAccommodations,
      reportYear,
      focusMonth,
      yearStartYmd: yearStart,
      yearEndYmd: reportYearEndYmd,
    });

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
  }

  const eventBreakdown = buildEventAudienceBreakdown(rawBookings, activePeriod);
  const festTypeBreakdown = buildFestTypeBreakdown(rawBookings, activePeriod);

  const hasRegisteredActivity =
    rawBookings.length > 0 ||
    rawInquiries.some((i) => i.status !== "converted") ||
    rawAccommodations.length > 0 ||
    rawAssets.length > 0 ||
    rawTransactions.length > 0 ||
    customerCount > 0 ||
    partnerCount > 0 ||
    propertyCount > 0 ||
    packageCount > 0 ||
    serviceCount > 0;

  return {
    kpis,
    monthlyRevenue,
    eventBreakdown,
    festTypeBreakdown,
    facility,
    reportYear,
    currentCalendarYear,
    calendarYearMin: pickerYearMin,
    calendarYearMax: pickerYearMax,
    focusMonth,
    allYears,
    reportsPeriodLabel,
    loadError,
    hasRegisteredActivity,
  };
}
