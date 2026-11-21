import { describe, expect, it, vi } from "vitest";

import {
  createCatalogItem,
  deleteCatalogItem,
  toCatalogPayload,
  updateCatalogItem,
} from "@/features/pricing/data/catalog";
import type { TenantSupabaseClient } from "@/lib/queries/types";

const form = { name: "  Basis ", description: "  fri tekst ", price: 43000, active: true };

describe("toCatalogPayload", () => {
  it("builds a package description from the packaged text and treats empty as null", () => {
    expect(toCatalogPayload("packages", form, "Tag\n– A").description).toBe("Tag\n– A");
    expect(toCatalogPayload("packages", form, "").description).toBeNull();
  });

  it("keeps the trimmed free text for a service and ignores the package text", () => {
    expect(toCatalogPayload("services", form, "ignored").description).toBe("fri tekst");
    expect(toCatalogPayload("services", { ...form, description: "   " }, "").description).toBeNull();
  });

  it("trims the name and passes price and active through", () => {
    expect(toCatalogPayload("services", form, "")).toMatchObject({ name: "Basis", price: 43000, active: true });
  });
});

function fakeClient() {
  const calls: Array<[string, unknown]> = [];
  const eq = vi.fn(async (col: string, val: unknown) => (calls.push([`eq:${col}`, val]), { error: null }));
  const client = {
    from: (table: string) => ({
      update: (p: unknown) => (calls.push([`update:${table}`, p]), { eq }),
      insert: async (p: unknown) => (calls.push([`insert:${table}`, p]), { error: null }),
      delete: () => (calls.push([`delete:${table}`, null]), { eq }),
    }),
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

const payload = { name: "X", description: null, price: 1, active: true };

describe("catalog data functions", () => {
  it("writes to the table for the kind (packages or services)", async () => {
    const a = fakeClient();
    await updateCatalogItem(a.client, "packages", "p1", payload);
    expect(a.calls).toEqual([["update:packages", payload], ["eq:id", "p1"]]);

    const b = fakeClient();
    await deleteCatalogItem(b.client, "services", "s1");
    expect(b.calls).toEqual([["delete:services", null], ["eq:id", "s1"]]);
  });

  it("attaches the organization when creating", async () => {
    const { client, calls } = fakeClient();
    await createCatalogItem(client, "services", "org-1", payload);
    expect(calls).toEqual([["insert:services", { ...payload, organization_id: "org-1" }]]);
  });
});
