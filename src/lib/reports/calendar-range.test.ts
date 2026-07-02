import { describe, expect, it } from "vitest";

import {
  buildReportsYearOptions,
  deriveReportsYearBounds,
  getReportsPlanningYearMax,
  resolveReportYearFromParams,
} from "@/lib/reports/calendar-range";

const NOW = new Date("2026-06-15T12:00:00");

describe("deriveReportsYearBounds", () => {
  it("includes planning years ahead of today", () => {
    const bounds = deriveReportsYearBounds({
      bookingDates: [],
      accommodationDates: [],
      now: NOW,
    });
    expect(bounds.currentCalendarYear).toBe(2026);
    expect(bounds.calendarYearMax).toBe(2028);
    expect(bounds.calendarYearMin).toBe(2020);
  });

  it("extends max when bookings exist further in the future", () => {
    const bounds = deriveReportsYearBounds({
      bookingDates: [{ start: "2030-03-10", end: null }],
      accommodationDates: [],
      now: NOW,
    });
    expect(bounds.calendarYearMax).toBe(2030);
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

  it("accepts a future year within URL limit", () => {
    expect(resolveReportYearFromParams("2029", NOW)).toBe(2029);
  });

  it("rejects years too far ahead", () => {
    expect(resolveReportYearFromParams("2035", NOW)).toBe(2026);
  });
});

describe("getReportsPlanningYearMax", () => {
  it("adds future buffer", () => {
    expect(getReportsPlanningYearMax(NOW)).toBe(2028);
  });
});
