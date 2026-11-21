import { describe, expect, it, vi } from "vitest";

import {
  createUnit,
  deleteReservation,
  deleteUnit,
  fetchReservationsInWindow,
  toReservationUpdatePayload,
  toUnitPayload,
  updateReservation,
  updateUnit,
} from "@/features/overnatting/data/overnatting";
import type { TenantSupabaseClient } from "@/lib/queries/types";

function fakeClient() {
  const calls: Array<[string, unknown?]> = [];
  const api: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push([name, args.length > 1 ? args : args[0]]);
    return api;
  };
  for (const m of ["select", "eq", "lt", "gt"]) api[m] = chain(m);
  api.then = (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null });
  const client = {
    from: (table: string) => {
      calls.push(["from", table]);
      return {
        ...api,
        update: (p: unknown) => (calls.push(["update", p]), api),
        delete: () => (calls.push(["delete"]), api),
        insert: async (p: unknown) => (calls.push(["insert", p]), { error: null }),
      };
    },
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

describe("payload mappers", () => {
  it("maps the unit form: trims, empty venue becomes null, missing sort order becomes 0", () => {
    expect(
      toUnitPayload({ name: " Villa ", propertyId: "", maxGuests: 6, notes: "  ", active: true, sortOrder: undefined } as never),
    ).toEqual({ name: "Villa", property_id: null, max_guests: 6, notes: null, active: true, sort_order: 0 });
  });

  it("maps the reservation edit form: empty times and NaN or missing price become null", () => {
    const base = {
      unitId: "u1",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-12",
      checkInTime: "",
      checkOutTime: "11:00",
      guestCount: 2,
      status: "confirmed",
      notes: " hei ",
    };
    expect(toReservationUpdatePayload({ ...base, totalPrice: undefined } as never)).toMatchObject({
      check_in_time: null,
      check_out_time: "11:00",
      notes: "hei",
      total_price: null,
    });
    expect(toReservationUpdatePayload({ ...base, totalPrice: Number.NaN } as never).total_price).toBeNull();
    expect(toReservationUpdatePayload({ ...base, totalPrice: 0 } as never).total_price).toBe(0);
  });
});

describe("data functions", () => {
  it("reads only the given organization inside the date window", async () => {
    const { client, calls } = fakeClient();
    await fetchReservationsInWindow(client, "org-1", { endExclusive: "2026-12-01", beforeFetch: "2026-09-30" });
    expect(calls).toContainEqual(["from", "accommodation_reservations"]);
    expect(calls).toContainEqual(["eq", ["organization_id", "org-1"]]);
    expect(calls).toContainEqual(["lt", ["check_in_date", "2026-12-01"]]);
    expect(calls).toContainEqual(["gt", ["check_out_date", "2026-09-30"]]);
  });

  it("attaches the organization when creating a unit", async () => {
    const { client, calls } = fakeClient();
    const payload = { name: "V", property_id: null, max_guests: 2, notes: null, active: true, sort_order: 0 };
    await createUnit(client, "org-1", payload);
    expect(calls).toContainEqual(["insert", { ...payload, organization_id: "org-1" }]);
  });

  it("updates and deletes by id on the right tables", async () => {
    const { client, calls } = fakeClient();
    const unit = { name: "V", property_id: null, max_guests: 2, notes: null, active: true, sort_order: 0 };
    await updateUnit(client, "u1", unit);
    await deleteUnit(client, "u1");
    await updateReservation(client, "r1", {
      unit_id: "u1", check_in_date: "a", check_out_date: "b", check_in_time: null, check_out_time: null,
      guest_count: 1, status: "confirmed", notes: null, total_price: null,
    });
    await deleteReservation(client, "r1");
    const tables = calls.filter(([k]) => k === "from").map(([, v]) => v);
    expect(tables).toEqual(["accommodation_units", "accommodation_units", "accommodation_reservations", "accommodation_reservations"]);
    expect(calls.filter(([k]) => k === "eq").map(([, v]) => v)).toEqual([["id", "u1"], ["id", "u1"], ["id", "r1"], ["id", "r1"]]);
    void vi;
  });
});
