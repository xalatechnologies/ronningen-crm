import Stripe from "stripe";

import { assertBillingConfigured } from "@/lib/billing/billing-env";

let stripeClient: Stripe | null = null;
let stripeClientSecretKey: string | null = null;

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2026-05-27.dahlia",
    typescript: true,
  });
}

function getOrCreateStripeClient(secretKey: string): Stripe {
  if (stripeClient && stripeClientSecretKey === secretKey) {
    return stripeClient;
  }

  stripeClient = createStripeClient(secretKey);
  stripeClientSecretKey = secretKey;
  return stripeClient;
}

export function getStripeClient(): Stripe {
  const billingCheck = assertBillingConfigured();
  if (!billingCheck.ok) {
    throw new Error(billingCheck.error);
  }

  return getOrCreateStripeClient(billingCheck.config.secretKey!);
}

/** Webhooks only require the secret key (not price ID or publishable key). */
export function getStripeClientForWebhook(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY mangler.");
  }

  return getOrCreateStripeClient(secretKey);
}
