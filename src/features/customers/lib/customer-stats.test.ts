import { describe, expect, it } from "vitest";

import { aggregateByCustomer, filterCustomers } from "@/features/customers/lib/customer-stats";
import type { CustomerBookingListItem, CustomerRow } from "@/features/customers/types";

const booking = (customer_id: string, total_price: number, remaining_amount: number): CustomerBookingListItem => ({
  id: `${customer_id}-${total_price}`,
  customer_id,
  event_type: "Bryllup",
  event_date: "2026-06-01",
  guest_count: 50,
  total_price,
  remaining_amount,
  status: "confirmed",
  propertyName: null,
});

describe("aggregateByCustomer", () => {
  it("counts bookings and sums billed and outstanding amounts per customer", () => {
    const map = aggregateByCustomer([booking("a", 1000, 400), booking("a", 500, 0), booking("b", 200, 200)]);
    expect(map.get("a")).toEqual({ count: 2, spent: 1500, outstanding: 400 });
    expect(map.get("b")).toEqual({ count: 1, spent: 200, outstanding: 200 });
    expect(map.get("c")).toBeUndefined();
  });

  it("returns an empty map without bookings", () => {
    expect(aggregateByCustomer([]).size).toBe(0);
  });

  it("treats numeric strings from the database as numbers", () => {
    const row = { ...booking("a", 0, 0), total_price: "100.5" as unknown as number, remaining_amount: "50" as unknown as number };
    expect(aggregateByCustomer([row]).get("a")).toEqual({ count: 1, spent: 100.5, outstanding: 50 });
  });
});

const customer = (name: string, email: string | null, phone: string | null): CustomerRow =>
  ({ id: name, name, email, phone }) as unknown as CustomerRow;

describe("filterCustomers", () => {
  const list = [
    customer("Kari Nordmann", "kari@example.no", "90011223"),
    customer("Ola Hansen", null, "41351547"),
    customer("Test", "wahid@xala.no", null),
  ];

  it("keeps everyone for an empty or blank query", () => {
    expect(filterCustomers(list, "")).toHaveLength(3);
    expect(filterCustomers(list, "   ")).toHaveLength(3);
  });

  it("searches name, e-mail and phone without caring about case", () => {
    expect(filterCustomers(list, "KARI").map((c) => c.name)).toEqual(["Kari Nordmann"]);
    expect(filterCustomers(list, "xala").map((c) => c.name)).toEqual(["Test"]);
    expect(filterCustomers(list, "4135").map((c) => c.name)).toEqual(["Ola Hansen"]);
  });

  it("does not crash on missing e-mail or phone and returns nothing when nothing matches", () => {
    expect(filterCustomers(list, "zzz")).toEqual([]);
  });
});
