import { resolveStripePriceId, resolveStripeProductId } from "@/lib/billing/billing-env";
import type { Translator, TranslationKey } from "@/i18n/types";

export type BillingPlanId = "standard";

export type BillingPlanFeatureKey =
  | "bookings"
  | "inquiries"
  | "customers"
  | "pricing"
  | "finance"
  | "invoices"
  | "assets"
  | "reports"
  | "team";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  displayPriceNok: number;
  trialDays: number;
  priceEnvKey: "STRIPE_PRICE_STANDARD" | "STRIPE_PRICE_ID";
  productEnvKey: "STRIPE_PRODUCT_STANDARD";
  features: readonly BillingPlanFeatureKey[];
};

const PLAN_FEATURE_KEYS: Record<BillingPlanFeatureKey, TranslationKey> = {
  bookings: "billing.planFeatures.bookings",
  inquiries: "billing.planFeatures.inquiries",
  customers: "billing.planFeatures.customers",
  pricing: "billing.planFeatures.pricing",
  finance: "billing.planFeatures.finance",
  invoices: "billing.planFeatures.invoices",
  assets: "billing.planFeatures.assets",
  reports: "billing.planFeatures.reports",
  team: "billing.planFeatures.team",
};

export function billingPlanFeatureLabel(key: BillingPlanFeatureKey, t: Translator): string {
  return t(PLAN_FEATURE_KEYS[key]);
}

export const BILLING_PLANS = {
  standard: {
    id: "standard",
    name: "Standard",
    displayPriceNok: 500,
    trialDays: 30,
    priceEnvKey: "STRIPE_PRICE_STANDARD",
    productEnvKey: "STRIPE_PRODUCT_STANDARD",
    features: [
      "bookings",
      "inquiries",
      "customers",
      "pricing",
      "finance",
      "invoices",
      "assets",
      "reports",
      "team",
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
