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

/** Beløp → paid/remaining/status for vanlig flyt (ikke waived/tvist). */
export function resolveStandardBookingPaymentFromAmounts(
  totalNok: number,
  paidNok: number,
): {
  paid: number;
  remaining: number;
  paymentStatus: "unpaid" | "partial" | "paid";
} {
  const total = totalNok;
  const inputPaid = Math.min(Math.max(0, paidNok), total);
  const paid = inputPaid;
  const remaining = Math.max(0, total - paid);
  if (total <= 0) {
    return { paid: 0, remaining: 0, paymentStatus: "paid" };
  }
  if (remaining <= 0) {
    return { paid: total, remaining: 0, paymentStatus: "paid" };
  }
  if (paid <= 0) {
    return { paid: 0, remaining: total, paymentStatus: "unpaid" };
  }
  return { paid, remaining, paymentStatus: "partial" };
}

type PaymentFormSnapshot = {
  totalNok: number;
  paidNok: number;
  paymentStatus: BookingPaymentStatus;
};

/**
 * Ved lagring: eksplisitt valg av fullt/ikke betalt oppdaterer innbetalt og rest.
 * Delvis betalt bruker registrerte beløp. waived/disputed/other beholder semantikk
 * (waived: rest alltid 0).
 */
export function resolveBookingPaymentForPersist(
  data: PaymentFormSnapshot,
): { paid: number; remaining: number; paymentStatus: BookingPaymentStatus } {
  const total = Math.max(0, data.totalNok);
  const inputPaid = Math.min(Math.max(0, data.paidNok), total);
  const ps = data.paymentStatus;

  if (ps === "waived") {
    const paid = Math.min(inputPaid, total);
    return { paid, remaining: 0, paymentStatus: "waived" };
  }

  if (ps === "disputed" || ps === "other") {
    const paid = inputPaid;
    const remaining = Math.max(0, total - paid);
    return { paid, remaining, paymentStatus: ps };
  }

  if (ps === "paid") {
    return { paid: total, remaining: 0, paymentStatus: "paid" };
  }

  if (ps === "unpaid") {
    return { paid: 0, remaining: total, paymentStatus: "unpaid" };
  }

  if (ps === "partial") {
    const paid = inputPaid;
    const remaining = Math.max(0, total - paid);
    return { paid, remaining, paymentStatus: "partial" };
  }

  return resolveStandardBookingPaymentFromAmounts(total, inputPaid);
}

/**
 * Ny reservasjon: avtalt total + depositum → innbetalt, rest og status.
 * Bruker beløpsbasert logikk (ikke eksplisitt «unpaid» som ignorerer depositum).
 */
export function resolveNewBookingPaymentAmounts(
  agreedTotalNok: number,
  depositPaidNok: number,
): ReturnType<typeof resolveStandardBookingPaymentFromAmounts> {
  const total = Number.isFinite(agreedTotalNok) ? agreedTotalNok : 0;
  const deposit = Number.isFinite(depositPaidNok) ? depositPaidNok : 0;
  return resolveStandardBookingPaymentFromAmounts(total, deposit);
}

/** Forhåndsvis restbeløp etter lagring ut fra valgt status og beløp. */
export function previewBookingRemainingAfterSave(
  data: PaymentFormSnapshot,
): number | null {
  const total = data.totalNok;
  if (!Number.isFinite(total)) return null;
  return resolveBookingPaymentForPersist(data).remaining;
}

/** Skjul fra «utestående fakturaer» når sperret som betalt eller ettergitt. */
export function hideFromOutstandingInvoices(
  stored: string | null | undefined,
): boolean {
  const m = normalizeBookingPaymentStatus(stored);
  return m === "paid" || m === "waived";
}
