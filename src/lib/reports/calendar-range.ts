import {
  CALENDAR_YEAR_CEILING,
  CALENDAR_YEAR_FLOOR,
  buildCalendarYearOptions,
  getCurrentCalendarYear,
  resolveCalendarYearMax,
  resolveCalendarYearMin,
} from "@/lib/calendar/year-range";

/** @deprecated Prefer CALENDAR_YEAR_FLOOR — kept for existing report imports. */
export const REPORTS_CALENDAR_MIN_YEAR = CALENDAR_YEAR_FLOOR;

/** @deprecated Prefer CALENDAR_YEAR_CEILING. */
export const REPORTS_CALENDAR_FUTURE_YEARS =
  CALENDAR_YEAR_CEILING - CALENDAR_YEAR_FLOOR;

/** @deprecated Prefer getReportsUrlYearMax / resolveCalendarYearMax. */
export const REPORTS_CALENDAR_URL_MAX_AHEAD =
  CALENDAR_YEAR_CEILING - CALENDAR_YEAR_FLOOR;

/** URL value for `year` when showing lifetime / all-years report data. */
export const REPORTS_ALL_YEARS_PARAM = "all";

export function isAllYearsReportParam(
  yearParam: string | undefined,
): boolean {
  return yearParam === REPORTS_ALL_YEARS_PARAM;
}

export { getCurrentCalendarYear };

export function getReportsPlanningYearMax(now = new Date()): number {
  return resolveCalendarYearMax(now);
}

export function getReportsUrlYearMax(now = new Date()): number {
  return resolveCalendarYearMax(now);
}

export function yearFromYmd(ymd: string | null | undefined): number | null {
  if (!ymd || ymd.length < 4) return null;
  const year = Number.parseInt(ymd.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function buildReportsYearOptions(
  calendarYearMin: number,
  calendarYearMax: number,
): number[] {
  return buildCalendarYearOptions(calendarYearMin, calendarYearMax);
}

export type ReportsYearBounds = {
  currentCalendarYear: number;
  calendarYearMin: number;
  calendarYearMax: number;
};

export function deriveReportsYearBounds(input: {
  bookingDates: { start: string; end: string | null }[];
  accommodationDates: { start: string; end: string | null }[];
  now?: Date;
}): ReportsYearBounds {
  const now = input.now ?? new Date();
  const currentCalendarYear = getCurrentCalendarYear(now);

  let dataMin: number | null = null;
  let dataMax: number | null = null;

  const bump = (ymd: string | null | undefined) => {
    const year = yearFromYmd(ymd);
    if (year == null) return;
    dataMin = dataMin == null ? year : Math.min(dataMin, year);
    dataMax = dataMax == null ? year : Math.max(dataMax, year);
  };

  for (const row of input.bookingDates) {
    bump(row.start);
    bump(row.end ?? row.start);
  }
  for (const row of input.accommodationDates) {
    bump(row.start);
    bump(row.end ?? row.start);
  }

  return {
    currentCalendarYear,
    calendarYearMin: resolveCalendarYearMin(now, dataMin),
    calendarYearMax: resolveCalendarYearMax(now, dataMax),
  };
}

export function resolveReportYearFromParams(
  yearParam: string | undefined,
  now = new Date(),
): number {
  const currentCalendarYear = getCurrentCalendarYear(now);
  const parsedYear = Number.parseInt(yearParam ?? "", 10);
  if (
    Number.isFinite(parsedYear) &&
    parsedYear >= CALENDAR_YEAR_FLOOR &&
    parsedYear <= getReportsUrlYearMax(now)
  ) {
    return parsedYear;
  }
  return currentCalendarYear;
}
