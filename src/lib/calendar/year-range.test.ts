import { describe, expect, it } from "vitest";

import {
  CALENDAR_YEAR_CEILING,
  CALENDAR_YEAR_FLOOR,
  buildCalendarYearOptions,
  defaultCalendarYearOptions,
  resolveCalendarYearMax,
  resolveCalendarYearMin,
} from "./year-range";

const NOW = new Date("2026-06-15T12:00:00");

describe("resolveCalendarYearMax", () => {
  it("uses the professional ceiling when today is earlier", () => {
    expect(resolveCalendarYearMax(NOW)).toBe(CALENDAR_YEAR_CEILING);
  });

  it("extends past the ceiling when data is further out", () => {
    expect(resolveCalendarYearMax(NOW, 2045)).toBe(2045);
  });
});

describe("resolveCalendarYearMin", () => {
  it("uses the floor when data is newer", () => {
    expect(resolveCalendarYearMin(NOW)).toBe(CALENDAR_YEAR_FLOOR);
  });

  it("extends below the floor for older data", () => {
    expect(resolveCalendarYearMin(NOW, 2015)).toBe(2015);
  });
});

describe("defaultCalendarYearOptions", () => {
  it("lists years from ceiling down to floor", () => {
    const years = defaultCalendarYearOptions(NOW);
    expect(years[0]).toBe(CALENDAR_YEAR_CEILING);
    expect(years[years.length - 1]).toBe(CALENDAR_YEAR_FLOOR);
    expect(years).toContain(2026);
    expect(years.length).toBe(CALENDAR_YEAR_CEILING - CALENDAR_YEAR_FLOOR + 1);
  });
});

describe("buildCalendarYearOptions", () => {
  it("lists years descending", () => {
    expect(buildCalendarYearOptions(2024, 2026)).toEqual([2026, 2025, 2024]);
  });
});
