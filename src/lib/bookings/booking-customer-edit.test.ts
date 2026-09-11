import { describe, expect, it } from "vitest";

import {
  bookingCustomerFieldsChanged,
  sharedCustomerLinkTotal,
} from "./booking-customer-edit";

describe("bookingCustomerFieldsChanged", () => {
  const current = {
    name: "Ada",
    phone: "90000000",
    email: "ada@example.com",
    address: "Gate 1",
  };

  it("detects address-only edits", () => {
    expect(
      bookingCustomerFieldsChanged(
        {
          customerName: "Ada",
          phone: "90000000",
          email: "ada@example.com",
          address: "Gate 2",
        },
        current,
      ),
    ).toBe(true);
  });

  it("returns false when nothing changed", () => {
    expect(
      bookingCustomerFieldsChanged(
        {
          customerName: "Ada",
          phone: "90000000",
          email: "ada@example.com",
          address: "Gate 1",
        },
        current,
      ),
    ).toBe(false);
  });

  it("treats empty address equal to null current", () => {
    expect(
      bookingCustomerFieldsChanged(
        {
          customerName: "Ada",
          phone: "90000000",
          email: "ada@example.com",
          address: "  ",
        },
        { ...current, address: null },
      ),
    ).toBe(false);
  });
});

describe("sharedCustomerLinkTotal", () => {
  it("includes accommodation reservations", () => {
    expect(
      sharedCustomerLinkTotal({
        bookings: 1,
        inquiries: 0,
        accommodation: 1,
      }),
    ).toBe(2);
  });
});
