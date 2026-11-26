import { describe, expect, it } from "vitest";

import { fetchSetupFacts } from "@/features/setup-checklist/data/fetch-setup-facts";
import type { TenantSupabaseClient } from "@/lib/queries/types";

type Call = { table: string; filters: Array<[string, unknown]> };

const ORG = { org_number: "1", address_line1: "a", city: "b", contact_email: "c", contact_phone: null, bank_account: null, payment_instructions: null };

/** A recording client: counts come from `counts[table]`, and every filter is logged per table. */
function fakeClient(options: { counts?: Record<string, number>; failTables?: string[]; org?: object | null; subscription?: object | null } = {}) {
  const calls: Call[] = [];
  const client = {
    from: (table: string) => {
      const call: Call = { table, filters: [] };
      calls.push(call);
      const builder: Record<string, unknown> = {};
      const record = (col: string, val: unknown) => (call.filters.push([col, val]), builder);
      builder.select = () => builder;
      builder.eq = record;
      builder.not = () => builder;
      builder.limit = () => builder;
      builder.maybeSingle = async () => {
        if (table === "organizations") return { data: options.org === undefined ? ORG : options.org, error: null };
        return { data: options.subscription ?? null, error: null };
      };
      builder.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          options.failTables?.includes(table)
            ? { count: null, error: { message: "nope" } }
            : { count: options.counts?.[table] ?? 0, error: null },
        ).then(resolve);
      return builder;
    },
  } as unknown as TenantSupabaseClient;
  return { client, calls };
}

describe("fetchSetupFacts", () => {
  it("limits every read to the one organization, so another tenant's rows can never count", async () => {
    const { client, calls } = fakeClient();
    await fetchSetupFacts(client, "org-1");
    expect(calls.length).toBe(9);
    for (const call of calls) {
      const scoped = call.table === "organizations" ? call.filters.some(([c, v]) => c === "id" && v === "org-1") : call.filters.some(([c, v]) => c === "organization_id" && v === "org-1");
      expect(scoped, `${call.table} must be filtered by the organization`).toBe(true);
    }
  });

  it("counts only active packages and services as prices", async () => {
    const { client, calls } = fakeClient({ counts: { packages: 2, services: 3 } });
    const facts = await fetchSetupFacts(client, "org-1");
    expect(facts?.priceCount).toBe(5);
    for (const table of ["packages", "services"]) {
      expect(calls.find((c) => c.table === table)?.filters).toContainEqual(["active", true]);
    }
  });

  it("maps the counts, the profile and a paid subscription", async () => {
    const { client } = fakeClient({
      counts: { properties: 1, organization_members: 3, organization_invitations: 2, booking_inquiries: 4, bookings: 5 },
      subscription: { provider_subscription_id: "sub_1" },
    });
    expect(await fetchSetupFacts(client, "org-1")).toMatchObject({
      profile: ORG,
      propertyCount: 1,
      memberCount: 3,
      invitationCount: 2,
      inquiryCount: 4,
      bookingCount: 5,
      hasSubscription: true,
    });
  });

  it("reads a failed count as zero instead of showing progress", async () => {
    const { client } = fakeClient({ counts: { properties: 4 }, failTables: ["properties"] });
    expect((await fetchSetupFacts(client, "org-1"))?.propertyCount).toBe(0);
  });

  it("returns null when the organization cannot be read", async () => {
    const { client } = fakeClient({ org: null });
    expect(await fetchSetupFacts(client, "org-1")).toBeNull();
  });
});
