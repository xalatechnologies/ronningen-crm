import { describe, expect, it } from "vitest";

import { CALENDAR_YEAR_CEILING, CALENDAR_YEAR_FLOOR } from "@/lib/calendar/year-range";
import {
  buildReportsYearOptions,
  deriveReportsYearBounds,
  getReportsPlanningYearMax,
  resolveReportYearFromParams,
} from "./calendar-range";

const NOW = new Date("2026-06-15T12:00:00");

describe("deriveReportsYearBounds", () => {
  it("includes years through the professional ceiling", () => {
    const bounds = deriveReportsYearBounds({
      bookingDates: [],
      accommodationDates: [],
      now: NOW,
    });
    expect(bounds.currentCalendarYear).toBe(2026);
    expect(bounds.calendarYearMax).toBe(CALENDAR_YEAR_CEILING);
    expect(bounds.calendarYearMin).toBe(CALENDAR_YEAR_FLOOR);
  });

  it("extends max when bookings exist further in the future", () => {
    const bounds = deriveReportsYearBounds({
      bookingDates: [{ start: "2045-03-10", end: null }],
      accommodationDates: [],
      now: NOW,
    });
    expect(bounds.calendarYearMax).toBe(2045);
  });

  it("extends min when historical bookings exist before floor", () => {
    const bounds = deriveReportsYearBounds({
      bookingDates: [{ start: "2018-11-20", end: null }],
      accommodationDates: [],
      now: NOW,
    });
    expect(bounds.calendarYearMin).toBe(2018);
  });
});

describe("buildReportsYearOptions", () => {
  it("lists years descending", () => {
    expect(buildReportsYearOptions(2024, 2028)).toEqual([
      2028, 2027, 2026, 2025, 2024,
    ]);
  });
});

describe("resolveReportYearFromParams", () => {
  it("defaults to current year", () => {
    expect(resolveReportYearFromParams(undefined, NOW)).toBe(2026);
  });

  it("accepts a future year within the ceiling", () => {
    expect(resolveReportYearFromParams("2035", NOW)).toBe(2035);
  });

  it("accepts the ceiling year", () => {
    expect(resolveReportYearFromParams(String(CALENDAR_YEAR_CEILING), NOW)).toBe(
      CALENDAR_YEAR_CEILING,
    );
  });

  it("rejects years beyond the resolved max", () => {
    expect(resolveReportYearFromParams("2099", NOW)).toBe(2026);
  });
});

describe("getReportsPlanningYearMax", () => {
  it("uses the shared ceiling", () => {
    expect(getReportsPlanningYearMax(NOW)).toBe(CALENDAR_YEAR_CEILING);
  });
});
