/** Lowest selectable year in the reports calendar (fallback when no data). */
export const REPORTS_CALENDAR_MIN_YEAR = 2020;

/** Years ahead of today always offered for planning / pipeline reporting. */
export const REPORTS_CALENDAR_FUTURE_YEARS = 2;

/** Upper bound for URL `year` validation (allows far-future bookings). */
export const REPORTS_CALENDAR_URL_MAX_AHEAD = 5;

/** URL value for `year` when showing lifetime / all-years report data. */
export const REPORTS_ALL_YEARS_PARAM = "all";

export function isAllYearsReportParam(
  yearParam: string | undefined,
): boolean {
  return yearParam === REPORTS_ALL_YEARS_PARAM;
}

export function getCurrentCalendarYear(now = new Date()): number {
  return now.getFullYear();
}

export function getReportsPlanningYearMax(now = new Date()): number {
  return getCurrentCalendarYear(now) + REPORTS_CALENDAR_FUTURE_YEARS;
}

export function getReportsUrlYearMax(now = new Date()): number {
  return getCurrentCalendarYear(now) + REPORTS_CALENDAR_URL_MAX_AHEAD;
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
  const min = Math.min(calendarYearMin, calendarYearMax);
  const max = Math.max(calendarYearMin, calendarYearMax);
  const list: number[] = [];
  for (let y = max; y >= min; y--) list.push(y);
  return list;
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
  const planningMax = getReportsPlanningYearMax(now);

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

  const calendarYearMin = Math.min(
    REPORTS_CALENDAR_MIN_YEAR,
    dataMin ?? currentCalendarYear,
  );
  const calendarYearMax = Math.max(
    planningMax,
    dataMax ?? currentCalendarYear,
  );

  return { currentCalendarYear, calendarYearMin, calendarYearMax };
}

export function resolveReportYearFromParams(
  yearParam: string | undefined,
  now = new Date(),
): number {
  const currentCalendarYear = getCurrentCalendarYear(now);
  const parsedYear = Number.parseInt(yearParam ?? "", 10);
  if (
    Number.isFinite(parsedYear) &&
    parsedYear >= REPORTS_CALENDAR_MIN_YEAR &&
    parsedYear <= getReportsUrlYearMax(now)
  ) {
    return parsedYear;
  }
  return currentCalendarYear;
}
