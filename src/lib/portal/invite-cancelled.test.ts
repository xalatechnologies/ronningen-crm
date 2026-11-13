import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ status: "cancelled", touched: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/i18n/server", () => ({ getServerTranslation: async () => ({ t: (k: string) => k }) }));
vi.mock("./mail", () => ({ sendPortalInviteEmail: async () => ({ ok: true }) }));
vi.mock("./db", () => ({ portalAccountsTable: () => { state.touched.push("portal_accounts"); throw new Error("must not touch portal_accounts"); } }));
vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data: table === "bookings" ? { id: "b", customer_id: "c", organization_id: "o", status: state.status } : { name: "Kari", email: "kari@example.no" },
      });
      return chain;
    },
  }),
}));

import { issuePortalInvite } from "./invite";

describe("issuePortalInvite on a cancelled booking", () => {
  it("refuses, before any portal account is created or e-mail is sent", async () => {
    const result = await issuePortalInvite({ organizationId: "o", bookingId: "b", invitedBy: null });
    expect(result).toEqual({ ok: false, error: "booking_cancelled" });
    expect(state.touched).toEqual([]);
  });

  it("does not refuse a booking that is not cancelled (it continues to the account step)", async () => {
    state.status = "pending";
    await expect(issuePortalInvite({ organizationId: "o", bookingId: "b", invitedBy: null })).rejects.toThrow("must not touch portal_accounts");
  });
});
