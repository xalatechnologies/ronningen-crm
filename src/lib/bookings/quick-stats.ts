import type {
  BookingListRow,
  BookingsQuickStats,
} from "@/components/bookings/types";
import { eachBookingYmdInRange } from "@/lib/booking-period";
import { pctDelta } from "@/lib/dashboard-metrics";
import {
  dateRangeOverlapsPeriod,
  type ReportPeriod,
} from "@/lib/reports/tenant-report-metrics";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Inclusive calendar month as yyyy-mm-dd range. */
export function calendarMonthPeriod(ref: Date): ReportPeriod {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    startYmd: `${y}-${pad2(m + 1)}-01`,
    endYmd: `${y}-${pad2(m + 1)}-${pad2(lastDay)}`,
  };
}

export function computeBookingsQuickStats(
  rows: BookingListRow[],
  now = new Date(),
): BookingsQuickStats {
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const thisYm = `${y}-${pad2(m0 + 1)}`;
  const prevD = new Date(y, m0 - 1, 1);
  const currentPeriod = calendarMonthPeriod(now);
  const prevPeriod = calendarMonthPeriod(prevD);

  const monthLabel = new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(now);
  const prevMonthLabel = new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
  }).format(prevD);

  let currentMonthRevenue = 0;
  let prevMonthRevenue = 0;
  const daysWithEvents = new Set<string>();
  const daysInMonth = new Date(y, m0 + 1, 0).getDate();

  const active = rows.filter((r) => r.status !== "cancelled");
  let guestSum = 0;

  for (const r of active) {
    guestSum += r.guests;

    if (
      dateRangeOverlapsPeriod(
        r.eventDateIso,
        r.eventEndDateIso,
        currentPeriod,
      )
    ) {
      currentMonthRevenue += r.totalNok;
    }
    if (
      dateRangeOverlapsPeriod(r.eventDateIso, r.eventEndDateIso, prevPeriod)
    ) {
      prevMonthRevenue += r.totalNok;
    }

    for (const ymd of eachBookingYmdInRange(
      r.eventDateIso,
      r.eventEndDateIso,
    )) {
      if (ymd.slice(0, 7) === thisYm) {
        daysWithEvents.add(ymd);
      }
    }
  }

  const calendarFillPct =
    daysInMonth > 0
      ? Math.min(100, Math.round((daysWithEvents.size / daysInMonth) * 100))
      : 0;

  const avgGuestsActive =
    active.length > 0 ? Math.round(guestSum / active.length) : null;

  return {
    currentMonthRevenue,
    prevMonthRevenue,
    monthOverMonthPct: pctDelta(prevMonthRevenue, currentMonthRevenue),
    monthLabel,
    prevMonthLabel,
    calendarFillPct,
    avgGuestsActive,
  };
}
