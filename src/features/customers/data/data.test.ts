import { describe, expect, it } from "vitest";

import {
  toCustomerProfilePayload,
  updateCustomerNotes,
  updateCustomerProfile,
} from "@/features/customers/data/customers";
import {
  createPartner,
  deletePartner,
  toPartnerPayload,
  updatePartner,
} from "@/features/customers/data/partners";
import type { Translator } from "@/i18n/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type Call = [string, unknown?, unknown?];

/** Records every call so a test can prove which filters were applied. */
function fakeClient() {
  const calls: Call[] = [];
  const chain = (kind: string, table: string, payload: unknown) => {
    calls.push([`${kind}:${table}`, payload]);
    const api = {
      eq: (col: string, val: unknown) => {
        calls.push([`eq:${col}`, val]);
        return api;
      },
      then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
    };
    return api;
  };
  const client = {
    from: (table: string) => ({
      update: (payload: unknown) => chain("update", table, payload),
      delete: () => chain("delete", table, null),
      insert: async (payload: unknown) => (calls.push([`insert:${table}`, payload]), { error: null }),
    }),
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

describe("customer data functions", () => {
  it("maps the profile form: trims the name and turns empty phone and e-mail into null", () => {
    expect(toCustomerProfilePayload({ name: "  Kari ", phone: " ", email: "" })).toEqual({
      name: "Kari",
      phone: null,
      email: null,
    });
  });

  it("scopes a profile update to the organization (wrong tenant changes nothing)", async () => {
    const { client, calls } = fakeClient();
    await updateCustomerProfile(client, "org-1", "c-1", { name: "Kari", phone: null, email: null });
    expect(calls).toContainEqual(["eq:id", "c-1"]);
    expect(calls).toContainEqual(["eq:organization_id", "org-1"]);
  });

  it("scopes a notes update to the organization", async () => {
    const { client, calls } = fakeClient();
    await updateCustomerNotes(client, "org-1", "c-1", "VIP");
    expect(calls[0]).toEqual(["update:customers", { notes: "VIP" }]);
    expect(calls).toContainEqual(["eq:organization_id", "org-1"]);
  });
});

describe("partner data functions", () => {
  const t = ((key: string) => (key === "customers.partnerCategories.cleaning" ? "Renhold" : key)) as unknown as Translator;

  it("maps the form: the typed category label becomes the stored preset value", () => {
    expect(
      toPartnerPayload({ category: " renhold ", name: "EDH", phone: "", email: " a@x.no ", notes: "  " } as never, t),
    ).toEqual({ category: "cleaning", name: "EDH", phone: null, email: "a@x.no", notes: null });
  });

  it("attaches the organization when creating", async () => {
    const { client, calls } = fakeClient();
    const payload = { category: "other", name: "X", phone: null, email: null, notes: null };
    await createPartner(client, "org-1", payload);
    expect(calls).toEqual([["insert:partners", { ...payload, organization_id: "org-1" }]]);
  });

  it("scopes update and delete to the organization", async () => {
    const { client, calls } = fakeClient();
    await updatePartner(client, "org-1", "p-1", { category: "other", name: "X", phone: null, email: null, notes: null });
    await deletePartner(client, "org-1", "p-1");
    const orgFilters = calls.filter(([k]) => k === "eq:organization_id");
    expect(orgFilters).toHaveLength(2);
    expect(orgFilters.every(([, v]) => v === "org-1")).toBe(true);
    expect(calls.filter(([k]) => k === "eq:id")).toHaveLength(2);
  });
});
