import type { EventKey, StatusKey } from "@/components/landing/tour-3d/screens/screen-types";

/** Made-up sample data for the 3D tour. No real customers. */

const day = (year: number, month: number, date: number) => new Date(Date.UTC(year, month - 1, date, 12));

/** The wedding booking the tour follows from screen to screen. */
export const FOCUS_BOOKING = {
  name: "Ingrid & Jonas Berg",
  surname: "Berg",
  event: "wedding" as EventKey,
  date: day(2027, 6, 14),
  guests: 84,
  amount: 48500,
  deposit: 12250,
  daysLeft: 202,
};

export type InquiryRow = { name: string; event: EventKey; date: Date; guests: number; amount: number; status: StatusKey };

export const SAMPLE_INQUIRIES: InquiryRow[] = [
  { name: FOCUS_BOOKING.name, event: "wedding", date: FOCUS_BOOKING.date, guests: 84, amount: 48500, status: "new" },
  { name: "Kari Nilsen", event: "birthday50", date: day(2027, 8, 2), guests: 45, amount: 21000, status: "offerSent" },
  { name: "Lysaker Regnskap AS", event: "christmasParty", date: day(2026, 12, 5), guests: 60, amount: 36900, status: "confirmed" },
  { name: "Familien Haugen", event: "confirmation", date: day(2027, 5, 10), guests: 38, amount: 17400, status: "offerSent" },
  { name: "Amir Rahimi", event: "birthday", date: day(2027, 3, 21), guests: 30, amount: 12800, status: "new" },
  { name: "Sofie Lund", event: "baptism", date: day(2027, 6, 5), guests: 25, amount: 9600, status: "confirmed" },
  { name: "Nordvik Bygg AS", event: "summerParty", date: day(2027, 6, 20), guests: 110, amount: 64000, status: "new" },
  { name: "Thea & Mats Olsen", event: "wedding", date: day(2027, 8, 28), guests: 96, amount: 55200, status: "offerSent" },
];

export const INQUIRY_COUNTS = { all: 12, newOnes: 4, offerSent: 5, confirmed: 3 };

/** The calendar shows June 2027, the month of the wedding. */
export const CALENDAR_MONTH = day(2027, 6, 1);

export type CalendarEntry = { who: string; event: EventKey | null; status: StatusKey };

export const CALENDAR_ENTRIES: Record<number, CalendarEntry> = {
  5: { who: "Lund", event: "baptism", status: "confirmed" },
  12: { who: "Vik AS", event: "summerParty", status: "confirmed" },
  19: { who: "Hansen", event: null, status: "reserved" },
  20: { who: "Nordvik", event: "summerParty", status: "new" },
  26: { who: "Strand", event: "anniversary", status: "confirmed" },
};

export type InvoiceRow = {
  number: string;
  name: string;
  kind: "deposit" | "final";
  due: Date;
  amount: number;
  /** null: the focus booking's deposit, which turns from sent to paid during the tour. */
  status: StatusKey | null;
};

export const SAMPLE_INVOICES: InvoiceRow[] = [
  { number: "F-2027-031", name: FOCUS_BOOKING.name, kind: "deposit", due: day(2026, 12, 1), amount: FOCUS_BOOKING.deposit, status: null },
  { number: "F-2027-030", name: "Lysaker Regnskap AS", kind: "final", due: day(2026, 12, 10), amount: 24900, status: "sent" },
  { number: "F-2027-029", name: "Familien Haugen", kind: "deposit", due: day(2026, 11, 20), amount: 9800, status: "overdue" },
  { number: "F-2027-028", name: "Sofie Lund", kind: "deposit", due: day(2026, 11, 15), amount: 4800, status: "paid" },
  { number: "F-2027-027", name: "Nordvik Bygg AS", kind: "deposit", due: day(2026, 11, 12), amount: 16000, status: "paid" },
  { number: "F-2027-026", name: "Kari Nilsen", kind: "deposit", due: day(2026, 12, 8), amount: 8400, status: "sent" },
  { number: "F-2027-025", name: "Vik AS", kind: "final", due: day(2026, 11, 1), amount: 31500, status: "paid" },
];

/** Invoice totals before the deposit is paid; the tour adds the deposit when it flips to paid. */
export const INVOICE_TOTALS = { outstanding: 198650, paidThisMonth: 52500, overdue: 9800 };

export const DASHBOARD_TOTALS = { invoiced: 842500, paid: 421250, unpaid: 421250, bookings: 18 };

/** Bar heights in percent of the tallest month; July (index 6) is highlighted. */
export const MONTHLY_BARS = [34, 52, 44, 66, 50, 82, 100, 58, 74, 48, 60, 40];
export const HIGHLIGHT_MONTH = 6;
export const HIGHLIGHT_REVENUE = 128400;

export const PAYMENT_ALERTS: { name: string; amount: number; eventDate: Date; status: StatusKey }[] = [
  { name: "Familien Haugen", amount: 9800, eventDate: day(2027, 5, 10), status: "overdue" },
  { name: "Kari Nilsen", amount: 8400, eventDate: day(2027, 8, 2), status: "dueSoon" },
  { name: "Lysaker Regnskap AS", amount: 24900, eventDate: day(2026, 12, 5), status: "reminded" },
];
