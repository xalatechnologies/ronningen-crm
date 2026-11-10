export type BookingConflictKind =
  | "booking_overlap"
  | "accommodation_overlap"
  | "invalid_period";

const CONSTRAINTS: ReadonlyArray<{
  code: string;
  name: string;
  kind: BookingConflictKind;
}> = [
  { code: "23P01", name: "bookings_no_double_booking", kind: "booking_overlap" },
  {
    code: "23P01",
    name: "accommodation_reservations_no_overlap",
    kind: "accommodation_overlap",
  },
  { code: "23514", name: "bookings_event_period_chk", kind: "invalid_period" },
];

/** Maps a Postgres exclusion/check violation to a conflict kind; never throws. */
export function bookingConflictKind(error: unknown): BookingConflictKind | null {
  if (!error || typeof error !== "object") return null;
  const e = error as Record<string, unknown>;
  const text = [e.message, e.details, e.hint]
    .filter((v): v is string => typeof v === "string")
    .join(" ");
  const code = typeof e.code === "string" ? e.code : null;
  for (const c of CONSTRAINTS) {
    if (code === c.code && text.includes(c.name)) return c.kind;
  }
  return null;
}

const MESSAGE_KEYS = {
  booking_overlap: "bookings.conflict.bookingOverlap",
  accommodation_overlap: "bookings.conflict.accommodationOverlap",
  invalid_period: "bookings.conflict.invalidPeriod",
} as const;

/** i18n key of the friendly message for a conflict error, or null. */
export function bookingConflictMessageKey(
  error: unknown,
): (typeof MESSAGE_KEYS)[BookingConflictKind] | null {
  const kind = bookingConflictKind(error);
  return kind ? MESSAGE_KEYS[kind] : null;
}
