import { resolveStripePriceId, resolveStripeProductId } from "@/lib/billing/billing-env";

export type BillingPlanId = "standard";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  displayPriceNok: number;
  trialDays: number;
  priceEnvKey: "STRIPE_PRICE_STANDARD" | "STRIPE_PRICE_ID";
  productEnvKey: "STRIPE_PRODUCT_STANDARD";
  features: readonly string[];
};

export const BILLING_PLANS = {
  standard: {
    id: "standard",
    name: "Standard",
    displayPriceNok: 500,
    trialDays: 30,
    priceEnvKey: "STRIPE_PRICE_STANDARD",
    productEnvKey: "STRIPE_PRODUCT_STANDARD",
    features: [
      "Bookinger",
      "Forespørsler",
      "Kunder og partnere",
      "Priser og tjenester",
      "Finans",
      "Fakturaoppfølging",
      "Inventar",
      "Rapporter",
      "Teamtilgang",
    ],
  },
} as const satisfies Record<BillingPlanId, BillingPlan>;

export const DEFAULT_BILLING_PLAN_ID: BillingPlanId = "standard";

export function getBillingPlan(planId: string): BillingPlan | null {
  if (planId in BILLING_PLANS) {
    return BILLING_PLANS[planId as BillingPlanId];
  }
  return null;
}

export function resolvePlanStripePriceId(_planId: BillingPlanId = "standard"): string | null {
  return resolveStripePriceId();
}

export function resolvePlanStripeProductId(_planId: BillingPlanId = "standard"): string | null {
  return resolveStripeProductId();
}
