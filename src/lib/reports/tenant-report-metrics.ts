import { eachBookingYmdInRange } from "@/lib/booking-period";
import { normalizeBookingAudience } from "@/lib/booking-audience";
import {
  isCancelledBookingStatus,
  pctDelta,
  startOfToday,
  ymd,
} from "@/lib/dashboard-metrics";
import { isIncomeTransactionType } from "@/lib/transaction-income";

export type ReportPeriod = {
  startYmd: string;
  endYmd: string;
};

export type ReportBookingRow = {
  event_type: string;
  fest_type: string | null;
  event_date: string;
  event_end_date: string | null;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
};

export type ReportInquiryRow = {
  status: string;
  estimated_total: number | null;
  preferred_event_date: string | null;
  created_at: string;
  converted_booking_id: string | null;
  converted_at?: string | null;
  updated_at?: string | null;
};

export type ReportTransactionRow = {
  type: string;
  amount: number;
  transaction_date: string;
};

export type ReportCustomerRow = {
  created_at: string;
};

export type ReportOutstandingBookingRow = {
  remaining_amount: number;
  status: string;
  event_date: string;
};

export type ReportAccommodationRow = {
  status: string;
  total_price: number | null;
  check_in_date: string;
  check_out_date: string;
};

export type BookingMoneyAggregate = {
  totalBooked: number;
  totalPaid: number;
  totalUnpaid: number;
  bookingCount: number;
  confirmedBookingCount: number;
  pendingBookingCount: number;
};

export type InquiryAggregate = {
  activeCount: number;
  estimatedTotalNok: number;
};

export type AccommodationAggregate = {
  reservationCount: number;
  totalBookedNok: number;
};

export type TransactionAggregate = {
  incomeNok: number;
  expenseNok: number;
  netNok: number;
};

export type InquiryPipelineAggregate = {
  openCount: number;
  estimatedNok: number;
  convertedCount: number;
  lostCount: number;
  conversionRatePct: number | null;
};

export type OutstandingBookingsAggregate = {
  outstandingNok: number;
  overdueUnpaidCount: number;
};

export type FestTypeBreakdownRow = {
  festType: string;
  count: number;
  pct: number;
};

function toComparableYmd(s: string | null | undefined): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) {
    return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** True when [rangeStart, rangeEnd] overlaps [periodStart, periodEnd] (inclusive). */
export function dateRangeOverlapsPeriod(
  rangeStartYmd: string,
  rangeEndYmd: string | null,
  period: ReportPeriod,
): boolean {
  const start = toComparableYmd(rangeStartYmd);
  if (!start) return false;
  const end = toComparableYmd(rangeEndYmd) ?? start;
  const rangeLo = start <= end ? start : end;
  const rangeHi = start <= end ? end : start;
  return rangeLo <= period.endYmd && rangeHi >= period.startYmd;
}

export function bookingOverlapsPeriod(
  row: Pick<ReportBookingRow, "event_date" | "event_end_date">,
  period: ReportPeriod,
): boolean {
  return dateRangeOverlapsPeriod(
    row.event_date,
    row.event_end_date,
    period,
  );
}

function normalizeStatus(
  s: string,
): "confirmed" | "pending" | "cancelled" {
  const x = s.toLowerCase();
  if (x === "confirmed" || x === "bekreftet") return "confirmed";
  if (x === "cancelled" || x === "avbestilt") return "cancelled";
  return "pending";
}

function isActiveInquiry(row: ReportInquiryRow): boolean {
  return row.status !== "converted" && !row.converted_booking_id;
}

function isCancelledAccommodation(status: string): boolean {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt" || x === "canceled";
}

export function inquiryInPeriod(row: ReportInquiryRow, period: ReportPeriod): boolean {
  if (!isActiveInquiry(row)) return false;
  const preferred = toComparableYmd(row.preferred_event_date);
  if (preferred) {
    return preferred >= period.startYmd && preferred <= period.endYmd;
  }
  const created = toComparableYmd(row.created_at);
  if (!created) return false;
  return created >= period.startYmd && created <= period.endYmd;
}

export function accommodationInPeriod(
  row: ReportAccommodationRow,
  period: ReportPeriod,
): boolean {
  if (isCancelledAccommodation(row.status)) return false;
  return dateRangeOverlapsPeriod(
    row.check_in_date,
    row.check_out_date,
    period,
  );
}

export function aggregateBookingMoney(
  rows: ReportBookingRow[],
  period: ReportPeriod,
): BookingMoneyAggregate {
  let totalBooked = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;
  let bookingCount = 0;
  let confirmedBookingCount = 0;
  let pendingBookingCount = 0;

  for (const b of rows) {
    if (isCancelledBookingStatus(b.status)) continue;
    if (!bookingOverlapsPeriod(b, period)) continue;

    totalBooked += Number(b.total_price);
    totalPaid += Number(b.paid_amount);
    totalUnpaid += Number(b.remaining_amount);
    bookingCount += 1;

    const s = normalizeStatus(b.status);
    if (s === "confirmed") confirmedBookingCount += 1;
    else if (s === "pending") pendingBookingCount += 1;
  }

  return {
    totalBooked,
    totalPaid,
    totalUnpaid,
    bookingCount,
    confirmedBookingCount,
    pendingBookingCount,
  };
}

export function aggregateInquiries(
  rows: ReportInquiryRow[],
  period: ReportPeriod,
): InquiryAggregate {
  let activeCount = 0;
  let estimatedTotalNok = 0;

  for (const row of rows) {
    if (!inquiryInPeriod(row, period)) continue;
    activeCount += 1;
    estimatedTotalNok += Number(row.estimated_total ?? 0);
  }

  return { activeCount, estimatedTotalNok };
}

function transactionInPeriod(
  row: ReportTransactionRow,
  period: ReportPeriod,
): boolean {
  const d = toComparableYmd(row.transaction_date);
  if (!d) return false;
  return d >= period.startYmd && d <= period.endYmd;
}

export function aggregateTransactions(
  rows: ReportTransactionRow[],
  period: ReportPeriod,
): TransactionAggregate {
  let incomeNok = 0;
  let expenseNok = 0;

  for (const row of rows) {
    if (!transactionInPeriod(row, period)) continue;
    const amount = Number(row.amount);
    if (isIncomeTransactionType(row.type)) {
      incomeNok += amount;
    } else {
      expenseNok += amount;
    }
  }

  return {
    incomeNok,
    expenseNok,
    netNok: incomeNok - expenseNok,
  };
}

function inquiryEventInPeriod(
  row: Pick<ReportInquiryRow, "converted_at" | "updated_at" | "created_at">,
  period: ReportPeriod,
): boolean {
  const eventYmd =
    toComparableYmd(row.converted_at) ??
    toComparableYmd(row.updated_at) ??
    toComparableYmd(row.created_at);
  if (!eventYmd) return false;
  return eventYmd >= period.startYmd && eventYmd <= period.endYmd;
}

export function aggregateInquiryPipeline(
  rows: ReportInquiryRow[],
  period: ReportPeriod,
): InquiryPipelineAggregate {
  const open = aggregateInquiries(rows, period);
  let convertedCount = 0;
  let lostCount = 0;

  for (const row of rows) {
    if (!inquiryEventInPeriod(row, period)) continue;
    const isConverted =
      row.status === "converted" || Boolean(row.converted_booking_id);
    if (isConverted) {
      convertedCount += 1;
      continue;
    }
    if (row.status === "lost") {
      lostCount += 1;
    }
  }

  const closedCount = convertedCount + lostCount;
  const conversionRatePct =
    closedCount > 0 ? (convertedCount / closedCount) * 100 : null;

  return {
    openCount: open.activeCount,
    estimatedNok: open.estimatedTotalNok,
    convertedCount,
    lostCount,
    conversionRatePct,
  };
}

export function countCustomersCreatedInPeriod(
  rows: ReportCustomerRow[],
  period: ReportPeriod,
): number {
  let count = 0;
  for (const row of rows) {
    const created = toComparableYmd(row.created_at);
    if (!created) continue;
    if (created >= period.startYmd && created <= period.endYmd) {
      count += 1;
    }
  }
  return count;
}

export function aggregateOutstandingBookings(
  rows: ReportOutstandingBookingRow[],
): OutstandingBookingsAggregate {
  let outstandingNok = 0;
  const todayYmd = ymd(startOfToday());
  let overdueUnpaidCount = 0;

  for (const row of rows) {
    if (isCancelledBookingStatus(row.status)) continue;
    const remaining = Number(row.remaining_amount);
    if (remaining <= 0) continue;
    outstandingNok += remaining;
    if (row.event_date < todayYmd) {
      overdueUnpaidCount += 1;
    }
  }

  return {
    outstandingNok,
    overdueUnpaidCount,
  };
}

export function aggregateAccommodation(
  rows: ReportAccommodationRow[],
  period: ReportPeriod,
): AccommodationAggregate {
  let reservationCount = 0;
  let totalBookedNok = 0;

  for (const row of rows) {
    if (!accommodationInPeriod(row, period)) continue;
    reservationCount += 1;
    totalBookedNok += Number(row.total_price ?? 0);
  }

  return { reservationCount, totalBookedNok };
}

export function buildEventAudienceBreakdown(
  rows: ReportBookingRow[],
  period: ReportPeriod,
): { eventType: string; count: number; pct: number }[] {
  let bedriftCount = 0;
  let privatCount = 0;

  for (const b of rows) {
    if (isCancelledBookingStatus(b.status)) continue;
    if (!bookingOverlapsPeriod(b, period)) continue;
    if (normalizeBookingAudience(b.event_type) === "Bedrift") {
      bedriftCount += 1;
    } else {
      privatCount += 1;
    }
  }

  const total = bedriftCount + privatCount;
  return [
    {
      eventType: "Bedrift",
      count: bedriftCount,
      pct: total > 0 ? (bedriftCount / total) * 100 : 0,
    },
    {
      eventType: "Privat",
      count: privatCount,
      pct: total > 0 ? (privatCount / total) * 100 : 0,
    },
  ];
}

export function buildFestTypeBreakdown(
  rows: ReportBookingRow[],
  period: ReportPeriod,
  limit = 5,
): FestTypeBreakdownRow[] {
  const counts = new Map<string, number>();

  for (const b of rows) {
    if (isCancelledBookingStatus(b.status)) continue;
    if (!bookingOverlapsPeriod(b, period)) continue;
    const label = b.fest_type?.trim() || "Uspesifisert";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([festType, count]) => ({
      festType,
      count,
      pct: (count / total) * 100,
    }));
}

/** Fakturert per måned (bookinger etter arrangementsdato + overnatting etter innsjekk). */
export function buildMonthlyInvoicedSeries(input: {
  bookings: ReportBookingRow[];
  accommodations: ReportAccommodationRow[];
  reportYear: number;
  focusMonth: number | null;
  yearStartYmd: string;
  yearEndYmd: string;
}): Map<number, number> {
  const { bookings, accommodations, reportYear, focusMonth, yearStartYmd, yearEndYmd } =
    input;
  const monthAmounts = new Map<number, number>();
  for (let m = 1; m <= 12; m++) monthAmounts.set(m, 0);

  if (focusMonth != null) {
    const period: ReportPeriod = {
      startYmd: `${reportYear}-${String(focusMonth).padStart(2, "0")}-01`,
      endYmd: lastDayOfMonthYmd(reportYear, focusMonth),
    };
    const bookingAgg = aggregateBookingMoney(bookings, period);
    const accAgg = aggregateAccommodation(accommodations, period);
    monthAmounts.set(focusMonth, bookingAgg.totalBooked + accAgg.totalBookedNok);
    return monthAmounts;
  }

  for (const b of bookings) {
    if (isCancelledBookingStatus(b.status)) continue;
    const d = toComparableYmd(b.event_date);
    if (!d || d < yearStartYmd || d > yearEndYmd) continue;
    const month = Number(d.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthAmounts.set(
        month,
        (monthAmounts.get(month) ?? 0) + Number(b.total_price),
      );
    }
  }

  for (const row of accommodations) {
    if (isCancelledAccommodation(row.status)) continue;
    const d = toComparableYmd(row.check_in_date);
    if (!d || d < yearStartYmd || d > yearEndYmd) continue;
    const month = Number(d.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthAmounts.set(
        month,
        (monthAmounts.get(month) ?? 0) + Number(row.total_price ?? 0),
      );
    }
  }

  return monthAmounts;
}

export function computeFakturertTrendPct(
  currentFakturert: number,
  previousFakturert: number,
): number | null {
  return pctDelta(previousFakturert, currentFakturert);
}

export function lastDayOfMonthYmd(y: number, month1to12: number): string {
  const d = new Date(y, month1to12, 0);
  const yStr = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${yStr}-${m}-${day}`;
}

export function sameDayPreviousYearYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setFullYear(d.getFullYear() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Booking event days that fall inside the period (for multi-day overlap checks). */
export function bookingDaysInPeriod(
  row: Pick<ReportBookingRow, "event_date" | "event_end_date">,
  period: ReportPeriod,
): string[] {
  const start = toComparableYmd(row.event_date);
  if (!start) return [];
  const end = toComparableYmd(row.event_end_date) ?? start;
  return eachBookingYmdInRange(start, end).filter(
    (ymd) => ymd >= period.startYmd && ymd <= period.endYmd,
  );
}
