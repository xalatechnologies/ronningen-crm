/** Lowest selectable calendar year across the app (fallback when no older data). */
export const CALENDAR_YEAR_FLOOR = 2020;

/**
 * Default upper selectable year for planning / charts / pickers.
 * Extends further when today or booking data is beyond this ceiling.
 */
export const CALENDAR_YEAR_CEILING = 2040;

export function getCurrentCalendarYear(now = new Date()): number {
  return now.getFullYear();
}

export function resolveCalendarYearMax(
  now = new Date(),
  dataMax?: number | null,
): number {
  return Math.max(
    CALENDAR_YEAR_CEILING,
    getCurrentCalendarYear(now),
    dataMax ?? Number.NEGATIVE_INFINITY,
  );
}

export function resolveCalendarYearMin(
  now = new Date(),
  dataMin?: number | null,
): number {
  return Math.min(
    CALENDAR_YEAR_FLOOR,
    getCurrentCalendarYear(now),
    dataMin ?? Number.POSITIVE_INFINITY,
  );
}

/** Descending year list for select menus (newest first). */
export function buildCalendarYearOptions(
  yearMin: number,
  yearMax: number,
): number[] {
  const min = Math.min(yearMin, yearMax);
  const max = Math.max(yearMin, yearMax);
  const list: number[] = [];
  for (let y = max; y >= min; y--) list.push(y);
  return list;
}

export function defaultCalendarYearOptions(now = new Date()): number[] {
  return buildCalendarYearOptions(
    resolveCalendarYearMin(now),
    resolveCalendarYearMax(now),
  );
}
