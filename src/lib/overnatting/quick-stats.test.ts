import type { AccommodationReservationRow } from "@/components/overnatting/types";
import { describe, expect, it } from "vitest";

import { computeAccommodationQuickStats } from "./quick-stats";

function row(
  overrides: Partial<AccommodationReservationRow> & Pick<AccommodationReservationRow, "id">,
): AccommodationReservationRow {
  return {
    unitId: "u1",
    unitName: "Leilighet A",
    customerId: "c1",
    customerName: "Test Kunde",
    checkInDate: "2026-06-10",
    checkOutDate: "2026-06-12",
    checkInTime: null,
    checkOutTime: null,
    status: "confirmed",
    guestCount: 2,
    notes: null,
    totalPrice: 5_000,
    ...overrides,
  };
}

describe("computeAccommodationQuickStats", () => {
  it("sums revenue for stays overlapping the selected month", () => {
    const stats = computeAccommodationQuickStats(
      [row({ id: "a", totalPrice: 12_000 })],
      1,
      "2026-06",
    );

    expect(stats.currentMonthRevenue).toBe(12_000);
    expect(stats.occupancyPct).toBeGreaterThan(0);
  });

  it("attributes overlapping stay revenue to previous month when viewing May", () => {
    const stats = computeAccommodationQuickStats(
      [
        row({
          id: "span",
          checkInDate: "2026-05-28",
          checkOutDate: "2026-06-02",
          totalPrice: 8_000,
        }),
      ],
      1,
      "2026-05",
    );

    expect(stats.currentMonthRevenue).toBe(8_000);
    expect(stats.prevMonthRevenue).toBe(0);
  });

  it("excludes cancelled stays from revenue and occupancy", () => {
    const stats = computeAccommodationQuickStats(
      [
        row({
          id: "cancelled",
          status: "cancelled",
          totalPrice: 20_000,
        }),
      ],
      1,
      "2026-06",
    );

    expect(stats.currentMonthRevenue).toBe(0);
    expect(stats.occupancyPct).toBe(0);
  });

  it("computes occupancy against active unit capacity", () => {
    const stats = computeAccommodationQuickStats(
      [
        row({
          id: "a",
          checkInDate: "2026-06-01",
          checkOutDate: "2026-06-03",
        }),
      ],
      2,
      "2026-06",
    );

    expect(stats.occupancyPct).toBeGreaterThan(0);
    expect(stats.occupancyPct).toBeLessThanOrEqual(100);
  });
});
