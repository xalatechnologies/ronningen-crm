import type { TransactionListItem } from "@/features/finance/types";
import { isIncomeTransactionType } from "@/lib/transaction-income";

/** Calendar date in local timezone (avoids UTC drift from toISOString). */
export function toLocalYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize PostgREST `date` or ISO datetime to `yyyy-MM-dd` for string range checks. */
export function transactionYmd(isoOrDate: string): string {
  const s = String(isoOrDate ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export function mergeRangeWithYmd(
  range: { from: string; to: string },
  ymd: string,
): { from: string; to: string } {
  const y = transactionYmd(ymd);
  if (!y) return range;

  let from = range.from ? transactionYmd(range.from) : "";
  let to = range.to ? transactionYmd(range.to) : "";

  if (!from && !to) return { from: y, to: y };
  if (!from) return { from: y, to };
  if (!to) return { from, to: y };

  if (from > to) [from, to] = [to, from];
  if (y < from) from = y;
  if (y > to) to = y;
  return { from, to };
}

export function defaultMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toLocalYmd(start), to: toLocalYmd(end) };
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function previousPeriodBounds(from: string, to: string) {
  const fromD = new Date(`${from}T12:00:00`);
  const toD = new Date(`${to}T12:00:00`);
  const days =
    Math.max(
      1,
      Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1,
    );
  const prevEnd = addDays(from, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { prevStart, prevEnd };
}

export function formatDisplayDate(iso: string, formatDate: (date: Date | string) => string) {
  return formatDate(`${iso}T12:00:00`);
}

export function sumType(rows: TransactionListItem[], income: boolean) {
  return rows.reduce((s, r) => {
    const inc = isIncomeTransactionType(r.type);
    if (inc !== income) return s;
    return s + Number(r.amount);
  }, 0);
}

export function pctDelta(prev: number, curr: number): number | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}
