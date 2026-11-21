import { UNKNOWN_CUSTOMER, type AccommodationReservationRow } from "@/features/overnatting/types";
import { dayBeforeYmd, monthEndExclusiveYm, monthFirstDayYm, ymAdd } from "@/lib/overnatting-month";

export type AccommodationStatusFilter = "all" | "tentative" | "confirmed" | "cancelled";

export function matchesAccommodationSearch(
  row: AccommodationReservationRow,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const blob = [row.customerName, row.unitName, row.notes ?? ""]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

export function matchesAccommodationDateRange(
  row: AccommodationReservationRow,
  fromYmd: string,
  toYmd: string,
): boolean {
  const start = row.checkInDate;
  const end = row.checkOutDate;

  if (fromYmd && toYmd) {
    const from = fromYmd <= toYmd ? fromYmd : toYmd;
    const to = fromYmd <= toYmd ? toYmd : fromYmd;
    return start <= to && end > from;
  }
  if (fromYmd) return end > fromYmd;
  if (toYmd) return start <= toYmd;
  return true;
}

/** Current month as "yyyy-MM". */
export function ymNow(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** One reservation row as the database returns it, with the joined customer and unit names. */
export type RawRes = {
  id: string;
  unit_id: string;
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  guest_count: number;
  notes: string | null;
  total_price: number | null;
  customers: { name: string } | null;
  accommodation_units: { name: string } | null;
};

/** Database rows to list rows: unknown status becomes "confirmed", empty times become null, missing customer is marked. */
export function mapReservations(data: unknown): AccommodationReservationRow[] {
  return (
    (data as RawRes[] | null | undefined)?.map((r) => {
      const st = r.status;
      const ok =
        st === "tentative" || st === "confirmed" || st === "cancelled";
      return {
        id: r.id,
        unitId: r.unit_id,
        unitName: r.accommodation_units?.name ?? "—",
        customerId: r.customer_id,
        customerName: r.customers?.name?.trim() || UNKNOWN_CUSTOMER,
        checkInDate: r.check_in_date.slice(0, 10),
        checkOutDate: r.check_out_date.slice(0, 10),
        checkInTime:
          r.check_in_time != null && String(r.check_in_time).trim() !== ""
            ? String(r.check_in_time).trim()
            : null,
        checkOutTime:
          r.check_out_time != null && String(r.check_out_time).trim() !== ""
            ? String(r.check_out_time).trim()
            : null,
        status: ok ? st : "confirmed",
        guestCount: r.guest_count,
        notes: r.notes ?? null,
        totalPrice:
          r.total_price != null && Number.isFinite(Number(r.total_price))
            ? Number(r.total_price)
            : null,
      };
    }) ?? []
  );
}

/** The date window to read: reservations that start before the end of the month and end after the day before the previous month starts. Null for an invalid month. */
export function reservationFetchWindow(ym: string): { endExclusive: string; beforeFetch: string } | null {
  const monthStart = monthFirstDayYm(ym);
  const endExclusive = monthEndExclusiveYm(ym);
  if (!monthStart || !endExclusive) return null;
  const prevStart = monthFirstDayYm(ymAdd(ym, -1));
  const beforeFetch = prevStart ? dayBeforeYmd(prevStart) : "";
  if (!beforeFetch) return null;
  return { endExclusive, beforeFetch };
}

/** Reservations that touch the given month. */
export function reservationsInMonth(reservations: readonly AccommodationReservationRow[], ym: string): AccommodationReservationRow[] {
  const ms = monthFirstDayYm(ym);
  const me = monthEndExclusiveYm(ym);
  if (!ms || !me) return [];
  const bm = dayBeforeYmd(ms);
  if (!bm) return [];
  return reservations.filter((r) => r.checkInDate < me && r.checkOutDate > bm);
}

export function countReservationsByStatus(rows: readonly AccommodationReservationRow[]) {
  return {
    all: rows.length,
    tentative: rows.filter((r) => r.status === "tentative").length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
  };
}

export type ReservationFilters = {
  query: string;
  statusFilter: AccommodationStatusFilter;
  unitFilter: string;
  dateFrom: string;
  dateTo: string;
};

export function filterReservations(
  rows: readonly AccommodationReservationRow[],
  { query, statusFilter, unitFilter, dateFrom, dateTo }: ReservationFilters,
): AccommodationReservationRow[] {
  let out = [...rows];
  if (query.trim()) out = out.filter((r) => matchesAccommodationSearch(r, query));
  if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
  if (unitFilter) out = out.filter((r) => r.unitId === unitFilter);
  if (dateFrom || dateTo) out = out.filter((r) => matchesAccommodationDateRange(r, dateFrom, dateTo));
  return out;
}
