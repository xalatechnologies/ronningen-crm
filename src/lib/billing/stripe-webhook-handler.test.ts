import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const constructEventMock = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripeClientForWebhook: () => ({
    webhooks: { constructEvent: constructEventMock },
  }),
}));

const insertMock = vi.fn();
const updateMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/billing/sync-subscription-from-stripe", () => ({
  syncSubscriptionFromStripe: vi.fn(),
  markOrganizationCanceled: vi.fn(),
  markOrganizationPastDue: vi.fn(),
}));

vi.mock("@/lib/billing/billing-env", () => ({
  getBillingMode: () => "sandbox",
  isStripeLivemodeExpected: () => false,
}));

import { handleStripeWebhookRequest } from "@/lib/billing/stripe-webhook-handler";
import { mockStripeWebhookRequest } from "../../../tests/helpers";

function setupClaimInsert(success: boolean) {
  insertMock.mockResolvedValue({
    data: success ? { event_id: "evt_1" } : null,
    error: success ? null : { code: "23505" },
  });
  const maybeSingleProcessed = vi.fn().mockResolvedValue({ data: { processed_at: null } });
  const eqEvent = vi.fn().mockReturnValue({ maybeSingle: maybeSingleProcessed });
  const selectProcessed = vi.fn().mockReturnValue({ eq: eqEvent });
  updateMock.mockResolvedValue({ error: null });
  fromMock.mockImplementation((table: string) => {
    if (table === "stripe_webhook_events") {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: insertMock,
          }),
        }),
        select: selectProcessed,
        update: vi.fn().mockReturnValue({ eq: updateMock }),
      };
    }
    return { select: vi.fn() };
  });
}

describe("handleStripeWebhookRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 500 when webhook secret is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "sig"),
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 when signature header is missing", async () => {
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", null),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature");
    });
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "bad-sig"),
    );
    expect(res.status).toBe(400);
  });

  it("ignores livemode mismatch with 200", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_live",
      type: "checkout.session.completed",
      livemode: true,
      created: 1,
      data: { object: {} },
    });
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "sig"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ignored).toBe(true);
    expect(json.reason).toBe("livemode_mismatch");
  });

  it("returns received true on valid unhandled event type", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "customer.created",
      livemode: false,
      created: 1,
      data: { object: { id: "cus_1" } },
    });
    setupClaimInsert(true);
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "sig"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("skips concurrent delivery while processed_at is still null", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_race",
      type: "customer.created",
      livemode: false,
      created: 1,
      data: { object: { id: "cus_1" } },
    });
    setupClaimInsert(false);
    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "sig"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(json.reason).toBe("in_progress");
  });

  it("returns 503 and does not mark processed when checkout org is unresolved", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_unresolved",
      type: "checkout.session.completed",
      livemode: false,
      created: 1,
      data: {
        object: {
          id: "cs_1",
          metadata: {},
          client_reference_id: null,
          customer: "cus_missing",
          subscription: "sub_1",
        },
      },
    });

    const deleteEq = vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({ error: null }),
    });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateMockLocal = vi.fn().mockReturnValue({ eq: updateEq });

    insertMock.mockResolvedValue({
      data: { event_id: "evt_unresolved" },
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: insertMock,
            }),
          }),
          update: updateMockLocal,
          delete: deleteMock,
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      return { select: vi.fn() };
    });

    const res = await handleStripeWebhookRequest(
      mockStripeWebhookRequest("{}", "sig"),
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("organization_unresolved");
    expect(deleteMock).toHaveBeenCalled();
    expect(updateMockLocal).not.toHaveBeenCalled();
  });
});