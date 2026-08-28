import { describe, expect, it } from "vitest";

import {
  compareBookingsByUpcomingFirst,
  sortBookingsByUpcomingFirst,
} from "./list-sort";

const TODAY = "2026-08-28";

describe("compareBookingsByUpcomingFirst", () => {
  it("puts upcoming bookings before past bookings", () => {
    const upcoming = { eventDateIso: "2026-09-01", eventEndDateIso: null };
    const past = { eventDateIso: "2026-07-01", eventEndDateIso: null };
    expect(
      compareBookingsByUpcomingFirst(upcoming, past, TODAY),
    ).toBeLessThan(0);
    expect(compareBookingsByUpcomingFirst(past, upcoming, TODAY)).toBeGreaterThan(
      0,
    );
  });

  it("sorts upcoming bookings ascending by start date (soonest first)", () => {
    const sooner = { eventDateIso: "2026-08-30", eventEndDateIso: null };
    const later = { eventDateIso: "2027-08-21", eventEndDateIso: null };
    expect(compareBookingsByUpcomingFirst(sooner, later, TODAY)).toBeLessThan(0);
  });

  it("sorts past bookings descending by start date (most recent past first)", () => {
    const recentPast = { eventDateIso: "2026-08-01", eventEndDateIso: null };
    const olderPast = { eventDateIso: "2025-01-01", eventEndDateIso: null };
    expect(
      compareBookingsByUpcomingFirst(recentPast, olderPast, TODAY),
    ).toBeLessThan(0);
  });

  it("treats multi-day bookings as current until the end date passes", () => {
    const ongoing = {
      eventDateIso: "2026-08-20",
      eventEndDateIso: "2026-08-30",
    };
    const past = { eventDateIso: "2026-08-01", eventEndDateIso: null };
    expect(compareBookingsByUpcomingFirst(ongoing, past, TODAY)).toBeLessThan(0);
  });
});

describe("sortBookingsByUpcomingFirst", () => {
  it("orders a mixed list with the next booking on top", () => {
    const rows = sortBookingsByUpcomingFirst(
      [
        { eventDateIso: "2027-08-21", eventEndDateIso: null },
        { eventDateIso: "2026-07-01", eventEndDateIso: null },
        { eventDateIso: "2026-08-30", eventEndDateIso: null },
        { eventDateIso: "2026-06-01", eventEndDateIso: null },
      ],
      TODAY,
    );

    expect(rows.map((r) => r.eventDateIso)).toEqual([
      "2026-08-30",
      "2027-08-21",
      "2026-07-01",
      "2026-06-01",
    ]);
  });
});
