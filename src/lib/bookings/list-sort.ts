/** yyyy-mm-dd for the booking period start. */
export type BookingListSortKey = {
  eventDateIso: string;
  eventEndDateIso: string | null;
};

export function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startYmd(row: BookingListSortKey): string {
  return row.eventDateIso.slice(0, 10);
}

/** Last inclusive day of the booking — used to keep multi-day events "current" until they end. */
function endYmd(row: BookingListSortKey): string {
  return (row.eventEndDateIso ?? row.eventDateIso).slice(0, 10);
}

function isUpcomingOrCurrent(row: BookingListSortKey, todayYmd: string): boolean {
  return endYmd(row) >= todayYmd;
}

/**
 * Sort bookings for list views: next upcoming booking first, then later
 * upcoming, then past bookings with the most recent past dates last.
 */
export function compareBookingsByUpcomingFirst(
  a: BookingListSortKey,
  b: BookingListSortKey,
  todayYmd: string = todayYmdLocal(),
): number {
  const aUpcoming = isUpcomingOrCurrent(a, todayYmd);
  const bUpcoming = isUpcomingOrCurrent(b, todayYmd);

  if (aUpcoming !== bUpcoming) {
    return aUpcoming ? -1 : 1;
  }

  const aStart = startYmd(a);
  const bStart = startYmd(b);

  if (aUpcoming) {
    return aStart.localeCompare(bStart);
  }

  return bStart.localeCompare(aStart);
}

export function sortBookingsByUpcomingFirst<T extends BookingListSortKey>(
  rows: T[],
  todayYmd: string = todayYmdLocal(),
): T[] {
  return [...rows].sort((a, b) => compareBookingsByUpcomingFirst(a, b, todayYmd));
}
