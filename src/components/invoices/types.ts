import type { BookingPaymentStatus } from "@/constants/booking-payment-status";

export type UnpaidInvoiceRow = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  eventDateIso: string;
  eventDateLabel: string;
  eventType: string;
  /** Eget fakturaforfall; null ⇒ app bruker arrangementsdato som referanse. */
  paymentDueDateIso: string | null;
  /** Registrert tidspunkt for sendt innkassovarsel. */
  collectionNoticeSentAt: string | null;
  /** Manuell / effektiv betalingsstatus (CRM). */
  paymentStatus: BookingPaymentStatus;
  totalNok: number;
  paidNok: number;
  remainingNok: number;
  bookingReference: string | null;
  propertyName: string | null;
};
