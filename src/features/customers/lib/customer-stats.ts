import type { CustomerBookingListItem, CustomerRow } from "@/features/customers/types";

export type CustomerBookingStats = { count: number; spent: number; outstanding: number };

/** Bookings, amount billed and amount still unpaid, per customer id. */
export function aggregateByCustomer(bookings: readonly CustomerBookingListItem[]) {
  const map = new Map<string, CustomerBookingStats>();
  for (const b of bookings) {
    const cur =
      map.get(b.customer_id) ?? { count: 0, spent: 0, outstanding: 0 };
    cur.count += 1;
    cur.spent += Number(b.total_price);
    cur.outstanding += Number(b.remaining_amount);
    map.set(b.customer_id, cur);
  }
  return map;
}

/** Free-text search over name, e-mail and phone (case-insensitive). An empty query keeps everyone. */
export function filterCustomers(customers: readonly CustomerRow[], query: string): CustomerRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...customers];
  return customers.filter((c) => [c.name, c.email ?? "", c.phone ?? ""].join(" ").toLowerCase().includes(q));
}
