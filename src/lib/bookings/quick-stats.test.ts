import type { BookingListRow } from "@/components/bookings/types";
import { describe, expect, it } from "vitest";

import { computeBookingsQuickStats } from "./quick-stats";

const june2026 = new Date(2026, 5, 15);

function row(
  overrides: Partial<BookingListRow> & Pick<BookingListRow, "id">,
): BookingListRow {
  return {
    customerId: "c1",
    customer: "Test Kunde",
    customerPhone: null,
    customerEmail: null,
    customerAddress: null,
    initials: "TK",
    avatarClass: "bg-accent text-primary",
    date: "1. jun. 2026",
    eventType: "Privat",
    guests: 50,
    totalNok: 50_000,
    paidNok: 0,
    remainingNok: 50_000,
    paidFraction: 0,
    paidLabel: "0 betalt",
    status: "confirmed",
    eventDateIso: "2026-06-10",
    eventEndDateIso: null,
    eventStartTime: null,
    eventEndTime: null,
    festType: null,
    bookingReference: null,
    notes: null,
    eventTypeForm: "Privat",
    paymentDueDateIso: null,
    collectionNoticeSentAt: null,
    paymentStatus: "unpaid",
    ...overrides,
  };
}

describe("computeBookingsQuickStats", () => {
  it("counts revenue when booking overlaps current month (starts previous month)", () => {
    const stats = computeBookingsQuickStats(
      [
        row({
          id: "span",
          eventDateIso: "2026-05-27",
          eventEndDateIso: "2026-06-02",
          totalNok: 50_000,
        }),
      ],
      june2026,
    );

    expect(stats.currentMonthRevenue).toBe(50_000);
    expect(stats.calendarFillPct).toBeGreaterThan(0);
  });

  it("excludes bookings that only fall in previous month", () => {
    const stats = computeBookingsQuickStats(
      [
        row({
          id: "may",
          eventDateIso: "2026-05-01",
          eventEndDateIso: "2026-05-10",
          totalNok: 30_000,
        }),
      ],
      june2026,
    );

    expect(stats.currentMonthRevenue).toBe(0);
    expect(stats.prevMonthRevenue).toBe(30_000);
  });

  it("excludes cancelled bookings from revenue", () => {
    const stats = computeBookingsQuickStats(
      [
        row({
          id: "cancelled",
          status: "cancelled",
          eventDateIso: "2026-06-15",
          totalNok: 20_000,
        }),
      ],
      june2026,
    );

    expect(stats.currentMonthRevenue).toBe(0);
  });

  it("includes zero-price overlapping bookings as 0 revenue", () => {
    const stats = computeBookingsQuickStats(
      [
        row({
          id: "free",
          eventDateIso: "2026-06-20",
          totalNok: 0,
        }),
      ],
      june2026,
    );

    expect(stats.currentMonthRevenue).toBe(0);
    expect(stats.calendarFillPct).toBeGreaterThan(0);
  });

  it("sums multiple overlapping bookings in current month", () => {
    const stats = computeBookingsQuickStats(
      [
        row({ id: "a", eventDateIso: "2026-06-05", totalNok: 10_000 }),
        row({ id: "b", eventDateIso: "2026-06-20", totalNok: 25_000 }),
      ],
      june2026,
    );

    expect(stats.currentMonthRevenue).toBe(35_000);
  });
});
