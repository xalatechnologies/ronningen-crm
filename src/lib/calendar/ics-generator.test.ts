import { describe, expect, it } from "vitest";

import {
  addDaysYmd,
  buildBookingsIcs,
  escapeIcsText,
  foldIcsLine,
  type IcsBookingEvent,
} from "./ics-generator";

function baseEvent(overrides: Partial<IcsBookingEvent> = {}): IcsBookingEvent {
  return {
    id: "b-1",
    bookingReference: "RN-2026-001",
    customerName: "Ola Nordmann",
    propertyName: "Rønningen Hovedhus",
    eventType: "Bryllup",
    festType: "Bryllupsfest",
    eventDate: "2026-08-30",
    eventEndDate: null,
    eventStartTime: "14:00",
    eventEndTime: "23:30",
    guestCount: 80,
    notes: "Gjester ankommer via hovedinngang.",
    status: "confirmed",
    updatedAt: "2026-08-27T12:34:56Z",
    ...overrides,
  };
}

function buildCalendar(events: IcsBookingEvent[]): string {
  return buildBookingsIcs({
    calendarName: "Rønningen — Bookinger",
    productId: "-//EventManager//Bookings 1.0//EN",
    organizationId: "org-uuid",
    events,
  });
}

/** Reverse RFC 5545 line folding so tests can assert full logical lines. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("escapeIcsText", () => {
  it("escapes backslashes, commas, semicolons, and newlines per RFC 5545", () => {
    const out = escapeIcsText("A, B; C\\D\nE");
    expect(out).toBe("A\\, B\\; C\\\\D\\nE");
  });

  it("strips carriage returns", () => {
    expect(escapeIcsText("A\r\nB")).toBe("A\\nB");
  });
});

describe("foldIcsLine", () => {
  it("passes short lines through unchanged", () => {
    expect(foldIcsLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds long lines at 75 octets with CRLF + space continuation", () => {
    const line = "DESCRIPTION:" + "x".repeat(200);
    const folded = foldIcsLine(line);
    const parts = folded.split("\r\n");
    expect(parts[0].length).toBe(75);
    for (let i = 1; i < parts.length; i += 1) {
      expect(parts[i].startsWith(" ")).toBe(true);
      expect(parts[i].length).toBeLessThanOrEqual(75);
    }
    expect(parts.join("").replace(/ /g, (m, offset) => (offset === 0 ? m : ""))).toContain(
      "DESCRIPTION",
    );
  });
});

describe("addDaysYmd", () => {
  it("adds one day and rolls over months", () => {
    expect(addDaysYmd("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("survives DST spring-forward without off-by-one", () => {
    expect(addDaysYmd("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("buildBookingsIcs", () => {
  it("emits a valid VCALENDAR envelope with VTIMEZONE and TZID", () => {
    const ics = buildCalendar([baseEvent()]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//EventManager//Bookings 1.0//EN");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Europe/Oslo");
    expect(ics).toContain("X-WR-CALNAME:Rønningen — Bookinger");
  });

  it("timed events use TZID=Europe/Oslo with local YYYYMMDDTHHMMSS", () => {
    const ics = buildCalendar([baseEvent()]);
    expect(ics).toContain("DTSTART;TZID=Europe/Oslo:20260830T140000");
    expect(ics).toContain("DTEND;TZID=Europe/Oslo:20260830T233000");
  });

  it("all-day events use VALUE=DATE with exclusive DTEND (+1 day)", () => {
    const ics = buildCalendar([
      baseEvent({ eventStartTime: null, eventEndTime: null }),
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260830");
    expect(ics).toContain("DTEND;VALUE=DATE:20260831");
  });

  it("multi-day all-day events set DTEND to last-day + 1", () => {
    const ics = buildCalendar([
      baseEvent({
        eventDate: "2026-08-30",
        eventEndDate: "2026-09-01",
        eventStartTime: null,
        eventEndTime: null,
      }),
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260830");
    expect(ics).toContain("DTEND;VALUE=DATE:20260902");
  });

  it("SUMMARY composes eventType, festType, and customer name", () => {
    const ics = buildCalendar([baseEvent()]);
    expect(ics).toContain("SUMMARY:Bryllup – Bryllupsfest – Ola Nordmann");
  });

  it("skips festType when it equals eventType", () => {
    const ics = buildCalendar([
      baseEvent({ festType: "Bryllup" }),
    ]);
    expect(ics).toContain("SUMMARY:Bryllup – Ola Nordmann");
  });

  it("DESCRIPTION includes reference, guest count, and notes", () => {
    const ics = unfold(buildCalendar([baseEvent()]));
    expect(ics).toContain(
      "DESCRIPTION:Ref: RN-2026-001\\nAntall gjester: 80\\n\\nGjester ankommer via hovedinngang.",
    );
  });

  it("LOCATION uses property name when present", () => {
    const ics = buildCalendar([baseEvent()]);
    expect(ics).toContain("LOCATION:Rønningen Hovedhus");
  });

  it("omits LOCATION when property is null", () => {
    const ics = buildCalendar([baseEvent({ propertyName: null })]);
    expect(ics).not.toContain("LOCATION:");
  });

  it("maps cancelled statuses to STATUS:CANCELLED + TRANSP:TRANSPARENT", () => {
    const ics = buildCalendar([baseEvent({ status: "avbestilt" })]);
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("TRANSP:TRANSPARENT");
  });

  it("maps pending statuses to STATUS:TENTATIVE", () => {
    const ics = buildCalendar([baseEvent({ status: "draft" })]);
    expect(ics).toContain("STATUS:TENTATIVE");
  });

  it("UID uses eventmanager.no by default and remains stable", () => {
    const ics = buildCalendar([baseEvent({ id: "abc-123" })]);
    expect(ics).toContain("UID:abc-123@eventmanager.no");
  });

  it("uses uidDomain override when provided", () => {
    const ics = buildBookingsIcs({
      calendarName: "T",
      productId: "-//x//x//EN",
      organizationId: "o",
      uidDomain: "example.no",
      events: [baseEvent({ id: "e-1" })],
    });
    expect(ics).toContain("UID:e-1@example.no");
  });

  it("escapes commas, semicolons, and newlines in summary/notes", () => {
    const ics = unfold(
      buildCalendar([
        baseEvent({
          customerName: "Ola, Nordmann; Jr\nsecond line",
          notes: "Note; with, weird\nline breaks",
        }),
      ]),
    );
    expect(ics).toContain("Ola\\, Nordmann\\; Jr\\nsecond line");
    expect(ics).toContain("Note\\; with\\, weird\\nline breaks");
  });

  it("emits an empty (but valid) calendar when there are no events", () => {
    const ics = buildCalendar([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
