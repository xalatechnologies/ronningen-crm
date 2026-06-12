import { handleStripeWebhookRequest } from "@/lib/billing/stripe-webhook-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleStripeWebhookRequest(request);
}
