import { describe, expect, it } from "vitest";

import { isNavActive } from "./nav-active";

describe("isNavActive", () => {
  it("lights Kundeportal, not Reservasjoner, on a customer's portal page", () => {
    const path = "/app/bookings/7c60c2ef/portal";
    expect(isNavActive("portal", "/app/portal", path)).toBe(true);
    expect(isNavActive("bookings", "/app/bookings", path)).toBe(false);
    expect(isNavActive("portal", "/app/portal", `${path}`)).toBe(true);
  });
  it("keeps Reservasjoner active on ordinary booking pages", () => {
    expect(isNavActive("bookings", "/app/bookings", "/app/bookings")).toBe(true);
    expect(isNavActive("bookings", "/app/bookings", "/app/bookings/7c60c2ef")).toBe(true);
    expect(isNavActive("portal", "/app/portal", "/app/bookings/7c60c2ef")).toBe(false);
  });
  it("lights Kundeportal on its own page and leaves other items alone", () => {
    expect(isNavActive("portal", "/app/portal", "/app/portal")).toBe(true);
    expect(isNavActive("customers", "/app/customers", "/app/customers/1")).toBe(true);
    expect(isNavActive("customers", "/app/customers", "/app/bookings/x/portal")).toBe(false);
  });
});
