import {
  DEFAULT_SUBSCRIPTION_PLAN,
  DEFAULT_SUBSCRIPTION_STATUS,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/constants/roles";
import {
  BILLING_PLANS,
  DEFAULT_BILLING_PLAN_ID,
} from "@/config/billing-plans";
import { isBillingEnabled } from "@/lib/billing/billing-env";

export {
  assertBillingConfigured,
  getAppOrigin,
  getBillingConfig,
  getBillingMode,
  getStripeModeLabel,
  isBillingEnabled,
  isSandboxBilling,
  isStripeConfigured,
  resolveStripePriceId,
  resolveStripeProductId,
} from "@/lib/billing/billing-env";
export type { BillingConfig, BillingMode } from "@/lib/billing/billing-env";

export const SAAS_TRIAL_DAYS = BILLING_PLANS.standard.trialDays;
export const SAAS_MONTHLY_PRICE_NOK = BILLING_PLANS.standard.displayPriceNok;
export const SAAS_PLAN_ID = DEFAULT_BILLING_PLAN_ID;
export const STRIPE_PROVIDER = "stripe";

export function getInitialSubscriptionStatus(): SubscriptionStatus {
  return isBillingEnabled() ? "incomplete" : DEFAULT_SUBSCRIPTION_STATUS;
}

export function getInitialSubscriptionPlan(): SubscriptionPlan | typeof SAAS_PLAN_ID {
  return isBillingEnabled() ? SAAS_PLAN_ID : DEFAULT_SUBSCRIPTION_PLAN;
}
