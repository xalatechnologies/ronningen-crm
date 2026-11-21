import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const constructEventMock = vi.fn();
const retrieveSubscriptionMock = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripeClientForWebhook: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveSubscriptionMock },
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
  resolveStripeProductId: () => "prod_em",
  resolveStripePriceId: () => "price_em",
}));

import { syncSubscriptionFromStripe } from "@/lib/billing/sync-subscription-from-stripe";
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

function subscriptionOn(product: string, over: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    metadata: {},
    items: { data: [{ price: { id: "price_x", product } }] },
    ...over,
  };
}
const ourSubscription = (over: Record<string, unknown> = {}) => subscriptionOn("prod_em", over);
const foreignSubscription = (over: Record<string, unknown> = {}) => subscriptionOn("prod_digilist", over);

function eventOf(type: string, object: Record<string, unknown>, id = "evt_x") {
  constructEventMock.mockReturnValue({ id, type, livemode: false, created: 1, data: { object } });
}

/** Claim insert works, and no organization is found for a customer. */
function setupClaimedNoOrg() {
  insertMock.mockResolvedValue({ data: { event_id: "evt_x" }, error: null });
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  fromMock.mockImplementation((table: string) => {
    if (table === "stripe_webhook_events") {
      return {
        insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ maybeSingle: insertMock }) }),
        update,
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ error: null }) }) }),
      };
    }
    if (table === "subscriptions") {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    }
    return { select: vi.fn() };
  });
  return { update };
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

    retrieveSubscriptionMock.mockResolvedValue(ourSubscription({ metadata: {} }));

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

  describe("events from other products on the same Stripe account (Digilist)", () => {
    it("ignores a foreign subscription event with 200 instead of asking Stripe to retry", async () => {
      eventOf("customer.subscription.created", foreignSubscription());
      const { update } = setupClaimedNoOrg();
      const res = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(res.status).toBe(200);
      expect((await res.json()).outcome).toBe("ignored");
      expect(syncSubscriptionFromStripe).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalled();
    });

    it("ignores a foreign subscription deletion", async () => {
      eventOf("customer.subscription.deleted", foreignSubscription());
      setupClaimedNoOrg();
      const res = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(res.status).toBe(200);
      expect((await res.json()).outcome).toBe("ignored");
    });

    it("ignores an invoice for a foreign subscription", async () => {
      eventOf("invoice.paid", { id: "in_1", parent: { subscription_details: { subscription: "sub_1" } }, subscription: "sub_1" });
      retrieveSubscriptionMock.mockResolvedValue(foreignSubscription());
      setupClaimedNoOrg();
      const res = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(res.status).toBe(200);
      expect((await res.json()).outcome).toBe("ignored");
      expect(syncSubscriptionFromStripe).not.toHaveBeenCalled();
    });

    it("ignores a foreign checkout and a checkout that is not a subscription", async () => {
      eventOf("checkout.session.completed", { id: "cs_1", mode: "subscription", metadata: {}, customer: "cus_x", subscription: "sub_1" });
      retrieveSubscriptionMock.mockResolvedValue(foreignSubscription());
      setupClaimedNoOrg();
      const foreign = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(foreign.status).toBe(200);
      expect((await foreign.json()).outcome).toBe("ignored");

      eventOf("checkout.session.completed", { id: "cs_2", mode: "payment", metadata: {}, customer: "cus_x", subscription: null }, "evt_y");
      setupClaimedNoOrg();
      const payment = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(payment.status).toBe(200);
      expect((await payment.json()).outcome).toBe("ignored");
    });

    it("still handles our own subscription event", async () => {
      eventOf("customer.subscription.updated", ourSubscription({ metadata: { organization_id: "org_1" } }));
      setupClaimedNoOrg();
      vi.mocked(syncSubscriptionFromStripe).mockResolvedValue({ ok: true });
      const res = await handleStripeWebhookRequest(mockStripeWebhookRequest("{}", "sig"));
      expect(res.status).toBe(200);
      expect((await res.json()).outcome).toBe("handled");
      expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org_1" }));
    });
  });
});
