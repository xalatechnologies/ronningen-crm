import { describe, expect, it } from "vitest";

import { PORTAL_PURGE_ORDER, TENANT_PURGE_ORDER } from "@/lib/admin/delete-organization-cascade";

describe("delete organization cascade", () => {
  it("removes customer portal data, children first, before bookings are purged", () => {
    const order = PORTAL_PURGE_ORDER as readonly string[];
    expect(order.indexOf("portal_wish_counters")).toBeLessThan(order.indexOf("portal_wish_quotes"));
    expect(order.indexOf("portal_wish_quotes")).toBeLessThan(order.indexOf("portal_wish_items"));
    expect(order.indexOf("portal_guest_emails")).toBeLessThan(order.indexOf("portal_guests"));
    expect(order.at(-1)).toBe("portal_accounts");
    expect((TENANT_PURGE_ORDER as readonly string[]).includes("portal_accounts")).toBe(false);
  });

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
