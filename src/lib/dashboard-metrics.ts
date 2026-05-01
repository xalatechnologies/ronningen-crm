import type { BookingStatus } from "@/components/bookings/types";
import type { DashboardMonthlySeries } from "@/components/dashboard/types";

export function isCancelledBookingStatus(status: string): boolean {
  const x = status.toLowerCase();
  return x === "cancelled" || x === "avbestilt";
}

export function normalizeDashboardBookingStatus(raw: string): BookingStatus {
  const x = raw.toLowerCase();
  if (x === "confirmed" || x === "bekreftet") return "confirmed";
  if (x === "cancelled" || x === "avbestilt") return "cancelled";
  return "pending";
}

export function parseLocalDate(isoDate: string): Date {
  const day = isoDate.slice(0, 10);
  return new Date(`${day}T12:00:00`);
}

export function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type MoneyBooking = {
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  event_date: string;
};

export function sumActiveBookingMoney(rows: MoneyBooking[]) {
  return rows
    .filter((r) => !isCancelledBookingStatus(r.status))
    .reduce(
      (acc, r) => {
        acc.invoiced += Number(r.total_price);
        acc.paid += Number(r.paid_amount);
        acc.unpaid += Number(r.remaining_amount);
        return acc;
      },
      { invoiced: 0, paid: 0, unpaid: 0 },
    );
}

function activeInEventMonth(
  rows: MoneyBooking[],
  year: number,
  monthIndex: number,
) {
  return rows.filter((r) => {
    if (isCancelledBookingStatus(r.status)) return false;
    const d = parseLocalDate(r.event_date);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
}

export function sumTotalPrice(rows: MoneyBooking[]) {
  return rows.reduce((s, r) => s + Number(r.total_price), 0);
}

/** Prosentvis endring; `null` uten meningsfull referanse. */
export function pctDelta(prev: number, cur: number): number | null {
  if (prev <= 0) {
    if (cur <= 0) return null;
    return null;
  }
  return ((cur - prev) / prev) * 100;
}

export function invoicedMonthOverMonthDelta(rows: MoneyBooking[], now = new Date()) {
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const prevRef = new Date(curYear, curMonth - 1, 1);
  const curTotal = sumTotalPrice(activeInEventMonth(rows, curYear, curMonth));
  const prevTotal = sumTotalPrice(
    activeInEventMonth(rows, prevRef.getFullYear(), prevRef.getMonth()),
  );
  return pctDelta(prevTotal, curTotal);
}

/** Fakturert beløp (total_price) per kalendermåned etter arrangementsdato — matcher dashbordets booking-KPIer. */
export function buildMonthlyInvoicedByEventYear(
  rows: MoneyBooking[],
  years: readonly number[],
): DashboardMonthlySeries[] {
  const set = new Set(years);
  const byYear = new Map<number, number[]>();
  for (const y of years) {
    byYear.set(y, Array.from({ length: 12 }, () => 0));
  }
  for (const r of rows) {
    if (isCancelledBookingStatus(r.status)) continue;
    const d = parseLocalDate(r.event_date);
    const y = d.getFullYear();
    if (!set.has(y)) continue;
    const m = d.getMonth();
    const arr = byYear.get(y);
    if (!arr) continue;
    arr[m] += Number(r.total_price);
  }
  return years.map((year) => ({
    year,
    months: byYear.get(year) ?? Array.from({ length: 12 }, () => 0),
  }));
}

export function countOverdueUnpaidBookings(
  rows: (MoneyBooking & { remaining_amount: number; event_date: string })[],
  today = startOfToday(),
) {
  const todayYmd = ymd(today);
  return rows.filter((r) => {
    if (isCancelledBookingStatus(r.status)) return false;
    if (Number(r.remaining_amount) <= 0) return false;
    return r.event_date < todayYmd;
  }).length;
}
