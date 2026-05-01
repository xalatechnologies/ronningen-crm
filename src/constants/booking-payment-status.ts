export const BOOKING_PAYMENT_STATUS_VALUES = [
  "unpaid",
  "partial",
  "paid",
  "waived",
  "disputed",
  "other",
] as const;

export type BookingPaymentStatus =
  (typeof BOOKING_PAYMENT_STATUS_VALUES)[number];

export const BOOKING_PAYMENT_STATUS_LABELS: Record<
  BookingPaymentStatus,
  string
> = {
  unpaid: "Ikke betalt",
  partial: "Delvis betalt",
  paid: "Fullt betalt",
  waived: "Ettergitt / makulert",
  disputed: "Under tvist",
  other: "Annet",
};

export function normalizeBookingPaymentStatus(
  raw: string | null | undefined,
): BookingPaymentStatus | null {
  if (raw == null || raw === "") return null;
  const x = raw.trim().toLowerCase();
  return (BOOKING_PAYMENT_STATUS_VALUES as readonly string[]).includes(x)
    ? (x as BookingPaymentStatus)
    : null;
}

/** Når `payment_status` i DB er tom (gamle rader), utled fra beløp. */
export function effectiveBookingPaymentStatus(
  stored: string | null | undefined,
  total: number,
  paid: number,
  remaining: number,
): BookingPaymentStatus {
  const manual = normalizeBookingPaymentStatus(stored);
  if (manual) return manual;
  if (total <= 0 || remaining <= 0) return "paid";
  if (paid <= 0) return "unpaid";
  return "partial";
}

/** Skjul fra «utestående fakturaer» når sperret som betalt eller ettergitt. */
export function hideFromOutstandingInvoices(
  stored: string | null | undefined,
): boolean {
  const m = normalizeBookingPaymentStatus(stored);
  return m === "paid" || m === "waived";
}
