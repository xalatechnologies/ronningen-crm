import { describe, expect, it } from "vitest";

import { TENANT_PURGE_ORDER } from "@/lib/admin/delete-organization-cascade";

describe("delete organization cascade", () => {
  it("purges dependent tenant tables before customers and properties", () => {
    const customersIdx = TENANT_PURGE_ORDER.indexOf("customers");
    const propertiesIdx = TENANT_PURGE_ORDER.indexOf("properties");

    expect(customersIdx).toBeGreaterThan(TENANT_PURGE_ORDER.indexOf("bookings"));
    expect(customersIdx).toBeGreaterThan(TENANT_PURGE_ORDER.indexOf("booking_inquiries"));
    expect(customersIdx).toBeGreaterThan(
      TENANT_PURGE_ORDER.indexOf("accommodation_reservations"),
    );
    expect(propertiesIdx).toBeGreaterThan(TENANT_PURGE_ORDER.indexOf("transactions"));
    expect(propertiesIdx).toBeGreaterThan(TENANT_PURGE_ORDER.indexOf("assets"));
    expect(propertiesIdx).toBeGreaterThan(TENANT_PURGE_ORDER.indexOf("bookings"));
  });
});
