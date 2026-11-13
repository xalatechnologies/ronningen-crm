import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  email: null as { id: string; guest_id: string | null; delivery: string | null } | null,
  updates: [] as { table: string; values: Record<string, unknown>; id: string }[],
}));

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.email }) }) }),
      update: (values: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          state.updates.push({ table, values, id });
          return { error: null };
        },
      }),
    }),
  }),
}));

import { POST } from "@/app/api/webhooks/resend/route";

const keyBytes = Buffer.from("route-test-key");
const secret = `whsec_${keyBytes.toString("base64")}`;

function call(payload: object, over: { signature?: string; timestamp?: string } = {}) {
  const body = JSON.stringify(payload);
  const timestamp = over.timestamp ?? String(Math.floor(Date.now() / 1000));
  const signature = over.signature ?? "v1," + createHmac("sha256", keyBytes).update(`m1.${timestamp}.${body}`).digest("base64");
  return POST(new Request("http://localhost/api/webhooks/resend", { method: "POST", body, headers: { "svix-id": "m1", "svix-timestamp": timestamp, "svix-signature": signature } }));
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    state.email = { id: "e1", guest_id: "g1", delivery: null };
    state.updates = [];
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is off until a secret is configured", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    expect((await call({ type: "email.bounced", data: { email_id: "x" } })).status).toBe(503);
  });
  it("rejects an unsigned or wrongly signed request and changes nothing", async () => {
    expect((await call({ type: "email.bounced", data: { email_id: "x" } }, { signature: "v1,AAAA" })).status).toBe(401);
    expect(state.updates).toHaveLength(0);
  });
  it("records a bounce on the e-mail and the guest", async () => {
    expect((await call({ type: "email.bounced", data: { email_id: "x" } })).status).toBe(200);
    expect(state.updates).toEqual([
      { table: "portal_guest_emails", values: expect.objectContaining({ delivery: "bounced" }), id: "e1" },
      { table: "portal_guests", values: { delivery_issue: "bounced" }, id: "g1" },
    ]);
  });
  it("clears the guest's problem when the e-mail is finally delivered", async () => {
    await call({ type: "email.delivered", data: { email_id: "x" } });
    expect(state.updates[1]).toEqual({ table: "portal_guests", values: { delivery_issue: null }, id: "g1" });
  });
  it("ignores a late 'delayed' after delivery, untracked events and unknown messages", async () => {
    state.email = { id: "e1", guest_id: "g1", delivery: "delivered" };
    await call({ type: "email.delivery_delayed", data: { email_id: "x" } });
    await call({ type: "email.opened", data: { email_id: "x" } });
    state.email = null;
    expect((await call({ type: "email.bounced", data: { email_id: "unknown" } })).status).toBe(200);
    expect(state.updates).toHaveLength(0);
  });
});
