import { describe, expect, it } from "vitest";

import { bookingConflictKind } from "./booking-conflict-error";

describe("bookingConflictKind", () => {
  it("detects booking overlap from a PostgREST error", () => {
    expect(
      bookingConflictKind({
        code: "23P01",
        message:
          'conflicting key value violates exclusion constraint "bookings_no_double_booking"',
        details: null,
        hint: null,
      }),
    ).toBe("booking_overlap");
  });

  it("detects accommodation overlap from details", () => {
    expect(
      bookingConflictKind({
        code: "23P01",
        message: "conflict",
        details: "accommodation_reservations_no_overlap",
      }),
    ).toBe("accommodation_overlap");
  });

  it("detects invalid period", () => {
    expect(
      bookingConflictKind({
        code: "23514",
        message:
          'new row violates check constraint "bookings_event_period_chk"',
      }),
    ).toBe("invalid_period");
  });

  it("handles plain Error with code", () => {
    const err = Object.assign(new Error("bookings_no_double_booking"), {
      code: "23P01",
    });
    expect(bookingConflictKind(err)).toBe("booking_overlap");
  });

  it("returns null for unrelated or malformed input", () => {
    expect(bookingConflictKind(null)).toBeNull();
    expect(bookingConflictKind("boom")).toBeNull();
    expect(bookingConflictKind(new Error("nope"))).toBeNull();
    expect(
      bookingConflictKind({ code: "23505", message: "bookings_no_double_booking" }),
    ).toBeNull();
  });
});
