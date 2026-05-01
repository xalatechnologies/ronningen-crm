import type { BookingPaymentStatus } from "@/constants/booking-payment-status";

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export type BookingListRow = {
  id: string;
  customerId: string;
  customer: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  initials: string;
  avatarClass: string;
  date: string;
  eventType: string;
  guests: number;
  totalNok: number;
  paidNok: number;
  remainingNok: number;
  paidFraction: number | null;
  paidLabel: string;
  status: BookingStatus;
  dimmed?: boolean;
  /** ISO date yyyy-mm-dd for filters / stats */
  eventDateIso: string;
  festType: string | null;
  bookingReference: string | null;
  notes: string | null;
  /** Normalisert til skjema (Bedrift | Privat). */
  eventTypeForm: "Bedrift" | "Privat";
  /** Valgfritt fakturaforfall (yyyy-mm-dd). */
  paymentDueDateIso: string | null;
  collectionNoticeSentAt: string | null;
  /** Manuell betalingsstatus (utledes fra DB eller beløp). */
  paymentStatus: BookingPaymentStatus;
};

export type BookingsQuickStats = {
  currentMonthRevenue: number;
  prevMonthRevenue: number;
  monthOverMonthPct: number | null;
  monthLabel: string;
  prevMonthLabel: string;
  /** Share of days in current month with ≥1 active booking */
  calendarFillPct: number;
  avgGuestsActive: number | null;
};
