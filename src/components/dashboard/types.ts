import type { BookingStatus } from "@/components/bookings/types";

/** Matchende rad for ubetalte bookinger (betalingsvarsler). */
export type DashboardPaymentAlert = {
  bookingId: string;
  title: string;
  amountNok: number;
  dueLabel: string;
  status: "overdue" | "dueToday";
};

/** Kommende booking rad i tabellen. */
export type DashboardUpcomingRow = {
  bookingId: string;
  dateLabel: string;
  timeLabel: string;
  customer: string;
  initials: string;
  type: string;
  venue: string;
  status: BookingStatus;
};

export type DashboardMonthlySeries = {
  year: number;
  /** Beløp per kalendermåned (0–11), kun inntektstransaksjoner. */
  months: number[];
};

export type DashboardHomeData = {
  loadError: string | null;
  kpis: {
    totalInvoicedNok: number;
    totalPaidNok: number;
    totalUnpaidNok: number;
    invoicedMonthDeltaPct: number | null;
    paidShareOfInvoicedPct: number | null;
    overdueUnpaidCount: number;
    activeBookingCount: number;
    propertyCount: number;
  };
  monthlyByYear: DashboardMonthlySeries[];
  paymentAlerts: DashboardPaymentAlert[];
  upcoming: DashboardUpcomingRow[];
};
