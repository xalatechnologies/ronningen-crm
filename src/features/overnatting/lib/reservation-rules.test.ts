import { describe, expect, it } from "vitest";

import {
  countReservationsByStatus,
  filterReservations,
  mapReservations,
  matchesAccommodationDateRange,
  matchesAccommodationSearch,
  reservationFetchWindow,
  reservationsInMonth,
  ymNow,
} from "@/features/overnatting/lib/reservation-rules";
import { UNKNOWN_CUSTOMER, type AccommodationReservationRow } from "@/features/overnatting/types";

const res = (over: Partial<AccommodationReservationRow>): AccommodationReservationRow => ({
  id: "r",
  unitId: "u1",
  unitName: "Leilighet A",
  customerId: "c1",
  customerName: "Kari Nordmann",
  checkInDate: "2026-11-10",
  checkOutDate: "2026-11-12",
  checkInTime: null,
  checkOutTime: null,
  status: "confirmed",
  guestCount: 2,
  notes: null,
  totalPrice: null,
  ...over,
});

describe("mapReservations", () => {
  const raw = {
    id: "r1",
    unit_id: "u1",
    customer_id: "c1",
    check_in_date: "2026-11-10T00:00:00+00:00",
    check_out_date: "2026-11-12",
    check_in_time: " 15:00 ",
    check_out_time: "",
    status: "weird",
    guest_count: 3,
    notes: null,
    total_price: "1200.5",
    customers: { name: "  Kari  " },
    accommodation_units: { name: "Leilighet A" },
  };

  it("maps names, trims times, cuts dates to yyyy-MM-dd and converts the price", () => {
    const [row] = mapReservations([raw]);
    expect(row).toMatchObject({
      unitName: "Leilighet A",
      customerName: "Kari",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-12",
      checkInTime: "15:00",
      checkOutTime: null,
      totalPrice: 1200.5,
      notes: null,
    });
  });

  it("falls back to confirmed for an unknown status and marks a missing customer", () => {
    const [row] = mapReservations([{ ...raw, customers: null, accommodation_units: null }]);
    expect(row.status).toBe("confirmed");
    expect(row.customerName).toBe(UNKNOWN_CUSTOMER);
    expect(row.unitName).toBe("—");
  });

  it("keeps a valid status, treats a bad price as null and handles no data", () => {
    expect(mapReservations([{ ...raw, status: "tentative", total_price: "abc" }])[0]).toMatchObject({
      status: "tentative",
      totalPrice: null,
    });
    expect(mapReservations(null)).toEqual([]);
  });
});

describe("reservationFetchWindow", () => {
  it("reads from the day before the previous month and up to the start of the next month", () => {
    expect(reservationFetchWindow("2026-11")).toEqual({ endExclusive: "2026-12-01", beforeFetch: "2026-09-30" });
    expect(reservationFetchWindow("2026-01")).toEqual({ endExclusive: "2026-02-01", beforeFetch: "2025-11-30" });
  });

  it("returns null for an invalid month", () => {
    expect(reservationFetchWindow("nope")).toBeNull();
  });
});

describe("reservationsInMonth", () => {
  const list = [
    res({ id: "in", checkInDate: "2026-11-10", checkOutDate: "2026-11-12" }),
    res({ id: "spans", checkInDate: "2026-10-30", checkOutDate: "2026-11-03" }),
    res({ id: "before", checkInDate: "2026-10-01", checkOutDate: "2026-10-03" }),
    res({ id: "after", checkInDate: "2026-12-01", checkOutDate: "2026-12-03" }),
  ];

  it("keeps reservations that touch the month, including ones that start earlier", () => {
    expect(reservationsInMonth(list, "2026-11").map((r) => r.id)).toEqual(["in", "spans"]);
  });

  it("returns nothing for an invalid month", () => {
    expect(reservationsInMonth(list, "x")).toEqual([]);
  });
});

describe("counts and filters", () => {
  const rows = [
    res({ id: "1", status: "confirmed", unitId: "u1", customerName: "Kari", notes: "sen ankomst" }),
    res({ id: "2", status: "tentative", unitId: "u2", unitName: "Villa", customerName: "Ola" }),
    res({ id: "3", status: "cancelled", unitId: "u1", customerName: "Per", checkInDate: "2026-11-20", checkOutDate: "2026-11-22" }),
  ];
  const none = { query: "", statusFilter: "all" as const, unitFilter: "", dateFrom: "", dateTo: "" };

  it("counts reservations per status", () => {
    expect(countReservationsByStatus(rows)).toEqual({ all: 3, confirmed: 1, tentative: 1, cancelled: 1 });
  });

  it("filters by status, unit and search text (name, unit and notes)", () => {
    expect(filterReservations(rows, { ...none, statusFilter: "tentative" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterReservations(rows, { ...none, unitFilter: "u1" }).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filterReservations(rows, { ...none, query: " VILLA " }).map((r) => r.id)).toEqual(["2"]);
    expect(filterReservations(rows, { ...none, query: "sen ank" }).map((r) => r.id)).toEqual(["1"]);
  });

  it("filters by a date range where the checkout day itself is free", () => {
    expect(matchesAccommodationDateRange(rows[0], "2026-11-12", "")).toBe(false);
    expect(matchesAccommodationDateRange(rows[0], "2026-11-11", "")).toBe(true);
    expect(matchesAccommodationDateRange(rows[0], "", "2026-11-10")).toBe(true);
    expect(matchesAccommodationDateRange(rows[0], "", "2026-11-09")).toBe(false);
    // a reversed range is swapped
    expect(matchesAccommodationDateRange(rows[0], "2026-11-15", "2026-11-09")).toBe(true);
    expect(filterReservations(rows, { ...none, dateFrom: "2026-11-19" }).map((r) => r.id)).toEqual(["3"]);
  });

  it("matches an empty query for everything", () => {
    expect(matchesAccommodationSearch(rows[0], "   ")).toBe(true);
  });
});

describe("ymNow", () => {
  it("returns the current month as yyyy-MM", () => {
    expect(ymNow()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
