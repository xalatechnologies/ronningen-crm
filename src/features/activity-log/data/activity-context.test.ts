import { describe, expect, it } from "vitest";

import { loadActivityContext } from "@/features/activity-log/data/activity-context";
import type { TenantSupabaseClient } from "@/lib/queries/types";

function fakeClient(tables: Record<string, unknown[]>) {
  const log: Array<[string, string, unknown]> = [];
  const client = {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: (c: string, v: unknown) => (log.push([table, `eq:${c}`, v]), chain),
        in: (c: string, v: unknown) => (log.push([table, `in:${c}`, v]), Promise.resolve({ data: tables[table] ?? [] })),
      };
      return chain;
    },
  } as unknown as TenantSupabaseClient;
  return { client, log };
}

describe("loadActivityContext", () => {
  it("returns empty maps without reading when nothing is named", async () => {
    const { client, log } = fakeClient({});
    const ctx = await loadActivityContext(client, "org-1", [], []);
    expect(ctx.people.size).toBe(0);
    expect(ctx.bookingReferences.size).toBe(0);
    expect(log).toEqual([]);
  });

  it("joins profile and organization role per user and maps booking references", async () => {
    const { client } = fakeClient({
      profiles: [{ id: "u1", full_name: " Eva ", email: "eva@x.no" }, { id: "u2", full_name: null, email: null }],
      organization_members: [{ user_id: "u1", role: "owner" }, { user_id: "u2", role: "weird" }],
      bookings: [{ id: "b1", booking_reference: "RN-1" }, { id: "b2", booking_reference: null }],
    });
    const ctx = await loadActivityContext(client, "org-1", ["u1", "u2"], ["b1", "b2"]);
    expect(ctx.people.get("u1")).toEqual({ name: "Eva", email: "eva@x.no", role: "owner" });
    expect(ctx.people.get("u2")).toEqual({ name: null, email: null, role: null });
    expect([...ctx.bookingReferences]).toEqual([["b1", "RN-1"]]);
  });

  it("scopes the role and booking reads to the organization", async () => {
    const { client, log } = fakeClient({});
    await loadActivityContext(client, "org-9", ["u1"], ["b1"]);
    expect(log).toContainEqual(["organization_members", "eq:organization_id", "org-9"]);
    expect(log).toContainEqual(["bookings", "eq:organization_id", "org-9"]);
  });
});
