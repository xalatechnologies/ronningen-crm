import type { AccommodationReservationRow } from "@/components/overnatting/types";
import { pctDelta } from "@/lib/dashboard-metrics";
import {
  aggregateAccommodation,
  accommodationInPeriod,
  type ReportAccommodationRow,
  type ReportPeriod,
} from "@/lib/reports/tenant-report-metrics";
import {
  dayBeforeYmd,
  daysInMonthYm,
  monthEndExclusiveYm,
  monthFirstDayYm,
  ymAdd,
} from "@/lib/overnatting-month";

export type AccommodationQuickStats = {
  currentMonthRevenue: number;
  prevMonthRevenue: number;
  monthOverMonthPct: number | null;
  monthLabel: string;
  prevMonthLabel: string;
  /** Share of active unit-nights occupied in the selected month */
  occupancyPct: number;
  avgGuestsActive: number | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Nights in half-open interval [checkIn, checkOut) as yyyy-mm-dd */
function eachStayYmd(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn.slice(0, 10);
  const end = checkOut.slice(0, 10);
  while (cur < end) {
    out.push(cur);
    const d = new Date(`${cur}T12:00:00`);
    d.setDate(d.getDate() + 1);
    cur = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return out;
}

function periodFromYm(ym: string): ReportPeriod | null {
  const startYmd = monthFirstDayYm(ym);
  const endEx = monthEndExclusiveYm(ym);
  if (!startYmd || !endEx) return null;
  const endYmd = dayBeforeYmd(endEx);
  if (!endYmd) return null;
  return { startYmd, endYmd };
}

function monthLabelFromYm(ym: string): string {
  const first = monthFirstDayYm(ym);
  if (!first) return ym;
  return new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${first}T12:00:00`));
}

function toReportRow(row: AccommodationReservationRow): ReportAccommodationRow {
  return {
    status: row.status,
    total_price: row.totalPrice,
    check_in_date: row.checkInDate,
    check_out_date: row.checkOutDate,
  };
}

export function computeAccommodationQuickStats(
  rows: AccommodationReservationRow[],
  activeUnitCount: number,
  monthYm: string,
): AccommodationQuickStats {
  const currentPeriod = periodFromYm(monthYm);
  const prevPeriod = periodFromYm(ymAdd(monthYm, -1));

  if (!currentPeriod || !prevPeriod) {
    return {
      currentMonthRevenue: 0,
      prevMonthRevenue: 0,
      monthOverMonthPct: null,
      monthLabel: monthYm,
      prevMonthLabel: ymAdd(monthYm, -1),
      occupancyPct: 0,
      avgGuestsActive: null,
    };
  }

  const reportRows = rows.map(toReportRow);
  const currentMonthRevenue = aggregateAccommodation(
    reportRows,
    currentPeriod,
  ).totalBookedNok;
  const prevMonthRevenue = aggregateAccommodation(
    reportRows,
    prevPeriod,
  ).totalBookedNok;

  const monthDays = new Set(daysInMonthYm(monthYm));
  let occupiedNights = 0;
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    for (const ymd of eachStayYmd(row.checkInDate, row.checkOutDate)) {
      if (monthDays.has(ymd)) occupiedNights += 1;
    }
  }

  const capacity = activeUnitCount * monthDays.size;
  const occupancyPct =
    capacity > 0
      ? Math.min(100, Math.round((occupiedNights / capacity) * 100))
      : 0;

  const activeInMonth = rows.filter(
    (row) =>
      row.status !== "cancelled" &&
      accommodationInPeriod(toReportRow(row), currentPeriod),
  );
  const guestSum = activeInMonth.reduce((sum, row) => sum + row.guestCount, 0);
  const avgGuestsActive =
    activeInMonth.length > 0
      ? Math.round(guestSum / activeInMonth.length)
      : null;

  return {
    currentMonthRevenue,
    prevMonthRevenue,
    monthOverMonthPct: pctDelta(prevMonthRevenue, currentMonthRevenue),
    monthLabel: monthLabelFromYm(monthYm),
    prevMonthLabel: monthLabelFromYm(ymAdd(monthYm, -1)),
    occupancyPct,
    avgGuestsActive,
  };
}
