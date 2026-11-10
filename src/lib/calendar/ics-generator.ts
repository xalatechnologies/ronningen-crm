/**
 * RFC 5545 iCalendar generator for the public bookings feed.
 *
 * Bookings store naive local dates/times (see `booking-period.ts` and the
 * `event_start_time` / `event_end_time` column comments). We emit them with
 * an explicit `TZID=Europe/Oslo` when times are present, and as all-day
 * events (`VALUE=DATE`) when times are absent — matching how Norwegian
 * venues actually schedule day-long events.
 *
 * Consumers: Digilist, Google Calendar (subscribe by URL), Apple Calendar.
 */

export type IcsBookingEvent = {
  id: string;
  bookingReference: string | null;
  customerName: string | null;
  propertyName: string | null;
  eventType: string;
  festType: string | null;
  eventDate: string; // YYYY-MM-DD (event_date)
  eventEndDate: string | null; // YYYY-MM-DD (inclusive)
  eventStartTime: string | null; // HH:MM local
  eventEndTime: string | null; // HH:MM local
  guestCount: number | null;
  notes: string | null;
  status: string;
  updatedAt: string; // ISO
};

export type BuildBookingsIcsInput = {
  calendarName: string;
  productId: string;
  organizationId: string;
  events: IcsBookingEvent[];
  /** Emitted as-is; used in UID to keep events stable across renames. */
  uidDomain?: string;
};

/**
 * VTIMEZONE for Europe/Oslo (CEST/CET) — hand-written per RFC 5545 §3.6.5.
 * Rules valid from 1996 onward (EU DST harmonization). This is intentionally
 * static: consumers cache VTIMEZONE bodies for years, so churn is bad.
 */
const EUROPE_OSLO_VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Oslo",
  "BEGIN:STANDARD",
  "DTSTART:19961027T030000",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19960331T020000",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
].join("\r\n");

/** RFC 5545 §3.3.11 text escaping. Order matters (backslash first). */
export function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** RFC 5545 §3.1: fold any line longer than 75 octets on a CRLF + SP. */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let index = 0;
  while (index < line.length) {
    const chunkSize = index === 0 ? 75 : 74;
    chunks.push(line.slice(index, index + chunkSize));
    index += chunkSize;
  }
  return chunks.join("\r\n ");
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function stripDate(isoDate: string): string {
  return isoDate.replace(/-/g, "").slice(0, 8);
}

/** Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD. UTC-anchored to avoid DST drift. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = pad2(base.getUTCMonth() + 1);
  const dd = pad2(base.getUTCDate());
  return `${yy}-${mm}-${dd}`;
}

/** YYYY-MM-DD + HH:MM → YYYYMMDDTHHMMSS (local, no offset — pairs with TZID). */
function localDateTime(ymd: string, hhmm: string): string {
  const [hh, mm] = hhmm.split(":");
  return `${stripDate(ymd)}T${hh}${mm}00`;
}

function utcStampFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return utcStampNow();
  }
  return utcStampFromDate(d);
}

function utcStampFromDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function utcStampNow(): string {
  return utcStampFromDate(new Date());
}

function statusToIcs(status: string): "CONFIRMED" | "TENTATIVE" | "CANCELLED" {
  const normalized = status.toLowerCase();
  if (normalized === "cancelled" || normalized === "avbestilt") return "CANCELLED";
  if (
    normalized === "confirmed" ||
    normalized === "bekreftet" ||
    normalized === "completed"
  )
    return "CONFIRMED";
  return "TENTATIVE";
}

function composeSummary(event: IcsBookingEvent): string {
  const parts: string[] = [];
  const label = event.eventType?.trim() || "Booking";
  parts.push(label);
  if (event.festType && event.festType.trim() && event.festType.trim() !== label) {
    parts.push(event.festType.trim());
  }
  if (event.customerName && event.customerName.trim()) {
    parts.push(event.customerName.trim());
  }
  return parts.join(" – ");
}

function composeDescription(event: IcsBookingEvent): string {
  const lines: string[] = [];
  if (event.bookingReference) lines.push(`Ref: ${event.bookingReference}`);
  if (event.guestCount && event.guestCount > 0) {
    lines.push(`Antall gjester: ${event.guestCount}`);
  }
  if (event.notes && event.notes.trim()) {
    lines.push("");
    lines.push(event.notes.trim());
  }
  return lines.join("\n");
}

function buildEventBlock(
  event: IcsBookingEvent,
  domain: string,
  fallbackStamp: string,
): string[] {
  const endYmd = event.eventEndDate ?? event.eventDate;
  const hasTimes = Boolean(event.eventStartTime && event.eventEndTime);

  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(`UID:${event.id}@${domain}`);
  lines.push(`DTSTAMP:${event.updatedAt ? utcStampFromIso(event.updatedAt) : fallbackStamp}`);

  if (hasTimes) {
    lines.push(
      `DTSTART;TZID=Europe/Oslo:${localDateTime(event.eventDate, event.eventStartTime!)}`,
    );
    lines.push(
      `DTEND;TZID=Europe/Oslo:${localDateTime(endYmd, event.eventEndTime!)}`,
    );
  } else {
    // All-day: DTEND is exclusive in RFC 5545, so add one day past the last inclusive day.
    lines.push(`DTSTART;VALUE=DATE:${stripDate(event.eventDate)}`);
    lines.push(`DTEND;VALUE=DATE:${stripDate(addDaysYmd(endYmd, 1))}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(composeSummary(event))}`);

  const description = composeDescription(event);
  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }

  if (event.propertyName && event.propertyName.trim()) {
    lines.push(`LOCATION:${escapeIcsText(event.propertyName.trim())}`);
  }

  lines.push(`STATUS:${statusToIcs(event.status)}`);
  if (statusToIcs(event.status) === "CANCELLED") {
    lines.push("TRANSP:TRANSPARENT");
  } else {
    lines.push("TRANSP:OPAQUE");
  }
  lines.push("END:VEVENT");

  return lines;
}

export function buildBookingsIcs(input: BuildBookingsIcsInput): string {
  const domain = input.uidDomain?.trim() || "eventmanager.no";
  const stamp = utcStampNow();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${escapeIcsText(input.productId)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
    "X-WR-TIMEZONE:Europe/Oslo",
    `X-EVENTMANAGER-ORG:${input.organizationId}`,
    EUROPE_OSLO_VTIMEZONE,
  ];

  for (const event of input.events) {
    lines.push(...buildEventBlock(event, domain, stamp));
  }

  lines.push("END:VCALENDAR");

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
