import { describe, expect, it } from "vitest";

import { fetchSetupFacts } from "@/features/settings/data/setup-facts";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type Call = { table: string; eq: Array<[string, unknown]> };

function fakeClient(tables: Record<string, { data?: unknown; count?: number }>) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => {
      const call: Call = { table, eq: [] };
      calls.push(call);
      const result = () => ({ data: tables[table]?.data ?? null, count: tables[table]?.count ?? 0, error: null });
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (column: string, value: unknown) => (call.eq.push([column, value]), chain);
      chain.maybeSingle = async () => result();
      chain.then = (resolve: (v: unknown) => void) => resolve(result());
      return chain;
    },
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

describe("fetchSetupFacts", () => {
  it("reads every table filtered by the given organization and maps the answers", async () => {
    const { client, calls } = fakeClient({
      organizations: {
        data: {
          org_number: "123",
          address_line1: "Gata 1",
          city: "Oslo",
          contact_email: "a@b.no",
          contact_phone: null,
          logo_url: "https://x/logo.png",
          subscription_status: "trialing",
          billing_exempt: false,
          portal_enabled: true,
        },
      },
      properties: { count: 2 },
      organization_members: { count: 3 },
      contract_templates: { count: 1 },
    });
    const facts = await fetchSetupFacts(client, "org-1", { hasCalendarFeed: true });
    expect(facts).toMatchObject({
      propertyCount: 2,
      memberCount: 3,
      hasContractTemplate: true,
      subscriptionStatus: "trialing",
      billingExempt: false,
      hasCalendarFeed: true,
      portalEnabled: true,
      hasLogo: true,
    });
    const orgScoped = calls.filter((c) => c.table !== "organizations");
    expect(orgScoped.length).toBe(3);
    for (const call of orgScoped) expect(call.eq).toContainEqual(["organization_id", "org-1"]);
    expect(calls.find((c) => c.table === "organizations")?.eq).toContainEqual(["id", "org-1"]);
  });

  it("treats a missing organization row and empty tables as nothing set up", async () => {
    const { client } = fakeClient({});
    const facts = await fetchSetupFacts(client, "org-2", { hasCalendarFeed: false });
    expect(facts).toMatchObject({
      propertyCount: 0,
      memberCount: 0,
      hasContractTemplate: false,
      subscriptionStatus: "",
      portalEnabled: false,
      hasLogo: false,
      hasCalendarFeed: false,
    });
    expect(facts.profile.org_number).toBeNull();
  });
});
