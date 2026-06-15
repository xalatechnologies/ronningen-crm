import { describe, expect, it } from "vitest";
import {
  previewBookingRemainingAfterSave,
  resolveBookingPaymentForPersist,
  resolveStandardBookingPaymentFromAmounts,
} from "./booking-payment-status";

describe("resolveStandardBookingPaymentFromAmounts", () => {
  it("derives unpaid from zero paid", () => {
    expect(resolveStandardBookingPaymentFromAmounts(10_000, 0)).toEqual({
      paid: 0,
      remaining: 10_000,
      paymentStatus: "unpaid",
    });
  });
});

describe("resolveBookingPaymentForPersist", () => {
  it("honors explicit paid even when innbetalt is 0", () => {
    expect(
      resolveBookingPaymentForPersist({
        totalNok: 10_000,
        paidNok: 0,
        paymentStatus: "paid",
      }),
    ).toEqual({
      paid: 10_000,
      remaining: 0,
      paymentStatus: "paid",
    });
  });

  it("honors explicit unpaid even when innbetalt is set", () => {
    expect(
      resolveBookingPaymentForPersist({
        totalNok: 10_000,
        paidNok: 5_000,
        paymentStatus: "unpaid",
      }),
    ).toEqual({
      paid: 0,
      remaining: 10_000,
      paymentStatus: "unpaid",
    });
  });

  it("keeps partial amounts from form", () => {
    expect(
      resolveBookingPaymentForPersist({
        totalNok: 10_000,
        paidNok: 4_000,
        paymentStatus: "partial",
      }),
    ).toEqual({
      paid: 4_000,
      remaining: 6_000,
      paymentStatus: "partial",
    });
  });
});

describe("previewBookingRemainingAfterSave", () => {
  it("reflects paid selection before save", () => {
    expect(
      previewBookingRemainingAfterSave({
        totalNok: 10_000,
        paidNok: 0,
        paymentStatus: "paid",
      }),
    ).toBe(0);
  });
});
