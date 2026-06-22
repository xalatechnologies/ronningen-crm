import { describe, expect, it } from "vitest";

import {
  aggregateAccommodation,
  aggregateBookingMoney,
  aggregateInquiries,
  aggregateInquiryPipeline,
  aggregateOutstandingBookings,
  aggregateTransactions,
  bookingOverlapsPeriod,
  buildMonthlyInvoicedSeries,
  countCustomersCreatedInPeriod,
  dateRangeOverlapsPeriod,
  inquiryInPeriod,
} from "@/lib/reports/tenant-report-metrics";

describe("dateRangeOverlapsPeriod", () => {
  const period = { startYmd: "2026-06-01", endYmd: "2026-06-30" };

  it("detects overlap for multi-day range", () => {
    expect(
      dateRangeOverlapsPeriod("2026-05-27", "2026-06-02", period),
    ).toBe(true);
  });

  it("returns false when range is before period", () => {
    expect(
      dateRangeOverlapsPeriod("2026-05-01", "2026-05-10", period),
    ).toBe(false);
  });
});

describe("aggregateBookingMoney", () => {
  const period = { startYmd: "2026-01-01", endYmd: "2026-12-31" };

  it("sums money for non-cancelled bookings in period", () => {
    const result = aggregateBookingMoney(
      [
        {
          event_type: "Privat",
          fest_type: "Bryllup",
          event_date: "2026-05-15",
          event_end_date: null,
          total_price: 100_000,
          paid_amount: 50_000,
          remaining_amount: 50_000,
          status: "confirmed",
        },
        {
          event_type: "Bedrift",
          fest_type: null,
          event_date: "2026-07-01",
          event_end_date: null,
          total_price: 20_000,
          paid_amount: 20_000,
          remaining_amount: 0,
          status: "pending",
        },
        {
          event_type: "Privat",
          fest_type: null,
          event_date: "2026-08-01",
          event_end_date: null,
          total_price: 10_000,
          paid_amount: 0,
          remaining_amount: 10_000,
          status: "avbestilt",
        },
      ],
      period,
    );

    expect(result.totalBooked).toBe(120_000);
    expect(result.totalPaid).toBe(70_000);
    expect(result.totalUnpaid).toBe(50_000);
    expect(result.bookingCount).toBe(2);
    expect(result.confirmedBookingCount).toBe(1);
    expect(result.pendingBookingCount).toBe(1);
  });

  it("includes multi-day booking when it overlaps period", () => {
    const result = aggregateBookingMoney(
      [
        {
          event_type: "Privat",
          fest_type: null,
          event_date: "2025-12-28",
          event_end_date: "2026-01-03",
          total_price: 30_000,
          paid_amount: 10_000,
          remaining_amount: 20_000,
          status: "confirmed",
        },
      ],
      { startYmd: "2026-01-01", endYmd: "2026-01-31" },
    );

    expect(result.bookingCount).toBe(1);
    expect(result.totalBooked).toBe(30_000);
  });
});

describe("aggregateInquiries", () => {
  it("counts active inquiries in period by preferred date", () => {
    const result = aggregateInquiries(
      [
        {
          status: "new",
          estimated_total: 15_000,
          preferred_event_date: "2026-03-10",
          created_at: "2026-01-01T00:00:00Z",
          converted_booking_id: null,
        },
        {
          status: "converted",
          estimated_total: 99_000,
          preferred_event_date: "2026-03-15",
          created_at: "2026-01-02T00:00:00Z",
          converted_booking_id: "b1",
        },
      ],
      { startYmd: "2026-03-01", endYmd: "2026-03-31" },
    );

    expect(result.activeCount).toBe(1);
    expect(result.estimatedTotalNok).toBe(15_000);
  });
});

describe("aggregateAccommodation", () => {
  it("sums accommodation in overlapping period", () => {
    const result = aggregateAccommodation(
      [
        {
          status: "confirmed",
          total_price: 8_000,
          check_in_date: "2026-06-10",
          check_out_date: "2026-06-12",
        },
        {
          status: "cancelled",
          total_price: 5_000,
          check_in_date: "2026-06-15",
          check_out_date: "2026-06-16",
        },
      ],
      { startYmd: "2026-06-01", endYmd: "2026-06-30" },
    );

    expect(result.reservationCount).toBe(1);
    expect(result.totalBookedNok).toBe(8_000);
  });
});

describe("buildMonthlyInvoicedSeries", () => {
  it("buckets booking total_price by event month", () => {
    const months = buildMonthlyInvoicedSeries({
      bookings: [
        {
          event_type: "Privat",
          fest_type: null,
          event_date: "2026-05-15",
          event_end_date: null,
          total_price: 50_000,
          paid_amount: 0,
          remaining_amount: 50_000,
          status: "confirmed",
        },
      ],
      accommodations: [],
      reportYear: 2026,
      focusMonth: null,
      yearStartYmd: "2026-01-01",
      yearEndYmd: "2026-12-31",
    });

    expect(months.get(5)).toBe(50_000);
    expect(months.get(1)).toBe(0);
  });
});

describe("bookingOverlapsPeriod", () => {
  it("matches inquiryInPeriod fallback to created_at", () => {
    expect(
      inquiryInPeriod(
        {
          status: "new",
          estimated_total: 1_000,
          preferred_event_date: null,
          created_at: "2026-04-12T10:00:00Z",
          converted_booking_id: null,
        },
        { startYmd: "2026-04-01", endYmd: "2026-04-30" },
      ),
    ).toBe(true);

    expect(
      bookingOverlapsPeriod(
        { event_date: "2026-04-01", event_end_date: "2026-04-05" },
        { startYmd: "2026-04-03", endYmd: "2026-04-30" },
      ),
    ).toBe(true);
  });
});

describe("aggregateTransactions", () => {
  const period = { startYmd: "2026-06-01", endYmd: "2026-06-30" };

  it("sums income and expense in period", () => {
    const result = aggregateTransactions(
      [
        { type: "income", amount: 10_000, transaction_date: "2026-06-10" },
        { type: "inntekt", amount: 5_000, transaction_date: "2026-06-12" },
        { type: "expense", amount: 3_000, transaction_date: "2026-06-15" },
        { type: "income", amount: 1_000, transaction_date: "2026-05-01" },
      ],
      period,
    );

    expect(result.incomeNok).toBe(15_000);
    expect(result.expenseNok).toBe(3_000);
    expect(result.netNok).toBe(12_000);
  });
});

describe("aggregateInquiryPipeline", () => {
  const period = { startYmd: "2026-03-01", endYmd: "2026-03-31" };

  it("counts open, converted, lost and conversion rate", () => {
    const result = aggregateInquiryPipeline(
      [
        {
          status: "new",
          estimated_total: 20_000,
          preferred_event_date: "2026-03-20",
          created_at: "2026-02-01T00:00:00Z",
          converted_booking_id: null,
        },
        {
          status: "converted",
          estimated_total: 50_000,
          preferred_event_date: "2026-04-01",
          created_at: "2026-01-01T00:00:00Z",
          converted_booking_id: "b1",
          converted_at: "2026-03-10T12:00:00Z",
        },
        {
          status: "lost",
          estimated_total: 10_000,
          preferred_event_date: null,
          created_at: "2026-01-15T00:00:00Z",
          converted_booking_id: null,
          updated_at: "2026-03-18T00:00:00Z",
        },
      ],
      period,
    );

    expect(result.openCount).toBe(1);
    expect(result.estimatedNok).toBe(20_000);
    expect(result.convertedCount).toBe(1);
    expect(result.lostCount).toBe(1);
    expect(result.conversionRatePct).toBe(50);
  });
});

describe("countCustomersCreatedInPeriod", () => {
  it("counts customers created within period", () => {
    const count = countCustomersCreatedInPeriod(
      [
        { created_at: "2026-05-10T00:00:00Z" },
        { created_at: "2026-05-28T00:00:00Z" },
        { created_at: "2026-04-01T00:00:00Z" },
      ],
      { startYmd: "2026-05-01", endYmd: "2026-05-31" },
    );

    expect(count).toBe(2);
  });
});

describe("aggregateOutstandingBookings", () => {
  it("sums outstanding and counts overdue unpaid", () => {
    const result = aggregateOutstandingBookings([
      {
        remaining_amount: 25_000,
        status: "confirmed",
        event_date: "2025-12-01",
      },
      {
        remaining_amount: 10_000,
        status: "confirmed",
        event_date: "2026-12-01",
      },
      {
        remaining_amount: 5_000,
        status: "avbestilt",
        event_date: "2025-11-01",
      },
    ]);

    expect(result.outstandingNok).toBe(35_000);
    expect(result.overdueUnpaidCount).toBe(1);
  });
});
