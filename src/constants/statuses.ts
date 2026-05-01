/** Booking workflow labels (foundation only). */
export const BOOKING_STATUSES = [
  "draft",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Transaction direction / kind (foundation only). */
export const TRANSACTION_TYPES = ["income", "expense"] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
