import { describe, expect, it } from "vitest";

import { createProperty, deleteProperty, updateProperty } from "@/features/properties/data/properties";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type Err = { message: string; code?: string } | null;

function fakeClient(error: Err = null) {
  const calls: Array<[string, unknown]> = [];
  const chain = {
    eq(col: string, val: unknown) {
      calls.push([`eq:${col}`, val]);
      return chain;
    },
    then(resolve: (v: { error: Err }) => unknown) {
      return Promise.resolve({ error }).then(resolve);
    },
  };
  const client = {
    from: (table: string) => ({
      insert: async (p: unknown) => (calls.push([`insert:${table}`, p]), { error }),
      update: (p: unknown) => (calls.push([`update:${table}`, p]), chain),
      delete: () => (calls.push([`delete:${table}`, null]), chain),
    }),
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

const payload = { name: "A", address: null, type: null, notes: null };

describe("property data functions", () => {
  it("attaches the organization when creating", async () => {
    const { client, calls } = fakeClient();
    expect(await createProperty(client, "org-1", payload)).toEqual({ ok: true });
    expect(calls).toEqual([["insert:properties", { ...payload, organization_id: "org-1" }]]);
  });

  it("filters updates by id and organization", async () => {
    const { client, calls } = fakeClient();
    await updateProperty(client, "org-1", "p1", payload);
    expect(calls).toEqual([["update:properties", payload], ["eq:id", "p1"], ["eq:organization_id", "org-1"]]);
  });

  it("filters deletes by id and organization", async () => {
    const { client, calls } = fakeClient();
    await deleteProperty(client, "org-1", "p1");
    expect(calls).toEqual([["delete:properties", null], ["eq:id", "p1"], ["eq:organization_id", "org-1"]]);
  });

  it("reports a venue that is still in use as inUse", async () => {
    const { client } = fakeClient({ message: "fk", code: "23503" });
    expect(await deleteProperty(client, "org-1", "p1")).toEqual({ ok: false, message: "fk", inUse: true });
  });

  it("reports other errors as not in use", async () => {
    const { client } = fakeClient({ message: "boom" });
    expect(await updateProperty(client, "org-1", "p1", payload)).toEqual({ ok: false, message: "boom", inUse: false });
  });
});
