import { describe, expect, it, vi } from "vitest";

import { createAsset, deleteAsset, toAssetPayload, updateAsset } from "@/features/assets/data/assets";
import type { TenantSupabaseClient } from "@/lib/queries/types";

const payload = {
  property_id: "p1",
  name: "Stol",
  quantity: 10,
  value: 1000,
  condition: "God",
  insurance_status: null,
};

function fakeClient() {
  const calls: Array<[string, unknown]> = [];
  const eq = vi.fn(async (col: string, val: unknown) => {
    calls.push([`eq:${col}`, val]);
    return { error: null };
  });
  const client = {
    from: (table: string) => ({
      update: (p: unknown) => (calls.push([`update:${table}`, p]), { eq }),
      insert: async (p: unknown) => (calls.push([`insert:${table}`, p]), { error: null }),
      delete: () => (calls.push([`delete:${table}`, null]), { eq }),
    }),
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

describe("toAssetPayload", () => {
  it("trims text and turns empty condition and insurance into null", () => {
    expect(
      toAssetPayload({
        propertyId: "p1",
        name: "  Stol ",
        quantity: 10,
        value: 1000,
        condition: "  ",
        insuranceStatus: "",
      }),
    ).toEqual({ ...payload, condition: null, insurance_status: null });
  });
});

describe("asset data functions", () => {
  it("updates one row by id", async () => {
    const { client, calls } = fakeClient();
    await updateAsset(client, "a1", payload);
    expect(calls).toEqual([["update:assets", payload], ["eq:id", "a1"]]);
  });

  it("creates a row with the organization id attached", async () => {
    const { client, calls } = fakeClient();
    await createAsset(client, "org1", payload);
    expect(calls).toEqual([["insert:assets", { ...payload, organization_id: "org1" }]]);
  });

  it("deletes one row by id", async () => {
    const { client, calls } = fakeClient();
    await deleteAsset(client, "a1");
    expect(calls).toEqual([["delete:assets", null], ["eq:id", "a1"]]);
  });
});
