import type { UnpaidInvoiceRow } from "@/components/invoices/types";

export type InvoiceRowFilter =
  | "all"
  | "overdue"
  | "unpaid"
  | "partial"
  | "upcoming";

/** yyyy-mm-dd in local calendar (caller should pass consistent today). */
export function effectiveDueIso(row: UnpaidInvoiceRow): string {
  return row.paymentDueDateIso ?? row.eventDateIso;
}

export function isOverdue(
  row: UnpaidInvoiceRow,
  todayYmd: string,
): boolean {
  if (row.remainingNok <= 0) return false;
  return effectiveDueIso(row) < todayYmd;
}

export function daysRelativeToDue(
  row: UnpaidInvoiceRow,
  todayYmd: string,
): number {
  const due = effectiveDueIso(row);
  const a = new Date(`${due}T12:00:00`).getTime();
  const b = new Date(`${todayYmd}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** True when CRM bør vurdere inkassolinje (heuristikk, ikke juridisk rådgivning). */
export function suggestInkassoReview(
  row: UnpaidInvoiceRow,
  todayYmd: string,
  minDaysAfterDue = 14,
): boolean {
  if (row.remainingNok <= 0) return false;
  if (row.collectionNoticeSentAt) return false;
  const d = daysRelativeToDue(row, todayYmd);
  return d >= minDaysAfterDue;
}

export function matchesInvoiceFilter(
  row: UnpaidInvoiceRow,
  filter: InvoiceRowFilter,
  todayYmd: string,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "overdue":
      return isOverdue(row, todayYmd);
    case "unpaid":
      return row.paymentStatus === "unpaid";
    case "partial":
      return row.paymentStatus === "partial";
    case "upcoming":
      return (
        row.remainingNok > 0 &&
        !isOverdue(row, todayYmd) &&
        effectiveDueIso(row) >= todayYmd
      );
    default:
      return true;
  }
}

export function sortInvoicesByUrgency(
  rows: UnpaidInvoiceRow[],
  todayYmd: string,
): UnpaidInvoiceRow[] {
  return [...rows].sort((a, b) => {
    const oa = isOverdue(a, todayYmd) ? 0 : 1;
    const ob = isOverdue(b, todayYmd) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    const da = effectiveDueIso(a);
    const db = effectiveDueIso(b);
    if (da !== db) return da.localeCompare(db);
    return b.remainingNok - a.remainingNok;
  });
}
