import { describe, expect, it } from "vitest";

import { buildCalendarYearMonths, buildRollingMonths } from "@/lib/dashboard-metrics";

const months = (m: Record<number, number>) => Array.from({ length: 12 }, (_, i) => m[i] ?? 0);

describe("buildRollingMonths", () => {
  it("returns the last 12 months ending with the current month, crossing the year boundary", () => {
    const rolling = buildRollingMonths([], new Date(2026, 10, 20));
    expect(rolling).toHaveLength(12);
    expect(rolling[0]).toMatchObject({ year: 2025, month: 11 });
    expect(rolling[11]).toMatchObject({ year: 2026, month: 10 });
  });

  it("reads each month from its own year's series", () => {
    const rolling = buildRollingMonths(
      [
        { year: 2025, months: months({ 11: 700 }) },
        { year: 2026, months: months({ 10: 50_100, 0: 10 }) },
      ],
      new Date(2026, 10, 20),
    );
    expect(rolling[0].amount).toBe(700);
    expect(rolling[1].amount).toBe(10);
    expect(rolling[11].amount).toBe(50_100);
  });

  it("counts a year missing from the series as 0 and ignores months outside the window", () => {
    // Window is Feb 2026 … Jan 2027: Jan 2026 is outside it, and 2027 has no series at all.
    const rolling = buildRollingMonths([{ year: 2026, months: months({ 0: 5, 1: 7 }) }], new Date(2027, 0, 5));
    expect(rolling.map((r) => r.amount).reduce((a, b) => a + b, 0)).toBe(7);
    expect(rolling[11]).toMatchObject({ year: 2027, month: 0, amount: 0 });
  });

  it("can look ahead: 3 months back, the current month and 8 months ahead, with future bookings included", () => {
    const rolling = buildRollingMonths(
      [{ year: 2027, months: months({ 2: 43_000, 4: 55_000 }) }],
      new Date(2026, 10, 20),
      12,
      8,
    );
    expect(rolling[0]).toMatchObject({ year: 2026, month: 7 });
    expect(rolling[3]).toMatchObject({ year: 2026, month: 10 });
    expect(rolling[11]).toMatchObject({ year: 2027, month: 6 });
    expect(rolling.find((r) => r.year === 2027 && r.month === 2)?.amount).toBe(43_000);
    expect(rolling.find((r) => r.year === 2027 && r.month === 4)?.amount).toBe(55_000);
  });
});

describe("buildCalendarYearMonths", () => {
  it("returns Jan to Dec of the year with amounts, and zeros for a missing year", () => {
    const series = [{ year: 2027, months: months({ 2: 43_000, 6: 230_000 }) }];
    const y = buildCalendarYearMonths(series, 2027);
    expect(y).toHaveLength(12);
    expect(y[0]).toMatchObject({ year: 2027, month: 0, amount: 0 });
    expect(y[2].amount).toBe(43_000);
    expect(y[6].amount).toBe(230_000);
    expect(buildCalendarYearMonths(series, 2030).every((m) => m.amount === 0)).toBe(true);
  });
});
