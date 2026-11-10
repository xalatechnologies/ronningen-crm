import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/billing/stripe-webhook-handler", () => ({
  handleStripeWebhookRequest: vi.fn(async () =>
    Response.json({ received: true }, { status: 200 }),
  ),
}));

import { POST } from "@/app/api/webhooks/stripe/route";
import { handleStripeWebhookRequest } from "@/lib/billing/stripe-webhook-handler";

describe("POST /api/webhooks/stripe", () => {
  it("delegates to handleStripeWebhookRequest", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(request);
    expect(handleStripeWebhookRequest).toHaveBeenCalledWith(request);
    expect(res.status).toBe(200);
  });
});
