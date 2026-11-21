import { describe, expect, it } from "vitest";

import {
  addDays,
  defaultMonthRange,
  mergeRangeWithYmd,
  pctDelta,
  previousPeriodBounds,
  sumType,
  toLocalYmd,
  transactionYmd,
} from "@/features/finance/lib/finance-math";
import type { TransactionListItem } from "@/features/finance/types";

const row = (type: string, amount: number): TransactionListItem => ({
  id: `${type}-${amount}`,
  property_id: "p1",
  propertyName: "Gård",
  type,
  category: "leie",
  description: null,
  amount,
  transaction_date: "2026-05-01",
});

describe("finance-math", () => {
  it("formats a local calendar date without UTC drift", () => {
    expect(toLocalYmd(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("normalizes a datetime to yyyy-MM-dd", () => {
    expect(transactionYmd("2026-05-01T10:00:00+00:00")).toBe("2026-05-01");
    expect(transactionYmd("2026-05-01")).toBe("2026-05-01");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the period of the same length right before a range", () => {
    // 31 days in May means 31 days before it: 31 March to 30 April.
    expect(previousPeriodBounds("2026-05-01", "2026-05-31")).toEqual({
      prevStart: "2026-03-31",
      prevEnd: "2026-04-30",
    });
    expect(previousPeriodBounds("2026-05-10", "2026-05-10")).toEqual({
      prevStart: "2026-05-09",
      prevEnd: "2026-05-09",
    });
  });

  it("widens a range so it contains a date", () => {
    expect(mergeRangeWithYmd({ from: "", to: "" }, "2026-05-10")).toEqual({ from: "2026-05-10", to: "2026-05-10" });
    expect(mergeRangeWithYmd({ from: "2026-05-10", to: "2026-05-20" }, "2026-05-01")).toEqual({
      from: "2026-05-01",
      to: "2026-05-20",
    });
    expect(mergeRangeWithYmd({ from: "2026-05-20", to: "2026-05-10" }, "2026-05-15")).toEqual({
      from: "2026-05-10",
      to: "2026-05-20",
    });
  });

  it("sums income and expense separately", () => {
    const rows = [row("income", 100), row("income", 50), row("expense", 30)];
    expect(sumType(rows, true)).toBe(150);
    expect(sumType(rows, false)).toBe(30);
  });

  it("computes a percentage change and avoids dividing by zero", () => {
    expect(pctDelta(100, 150)).toBe(50);
    expect(pctDelta(200, 100)).toBe(-50);
    expect(pctDelta(0, 100)).toBeNull();
    expect(pctDelta(0, 0)).toBeNull();
  });

  it("builds the current month as first to last day", () => {
    const { from, to } = defaultMonthRange();
    expect(from.endsWith("-01")).toBe(true);
    expect(to >= from).toBe(true);
    expect(from.slice(0, 7)).toBe(to.slice(0, 7));
  });
});
