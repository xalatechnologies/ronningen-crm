import type { TranslationKey } from "@/i18n/types";
import {
  canManageStripeSubscription,
  canOfferStripeCheckout,
  needsStripeCheckout,
} from "@/lib/billing/billing-ui-state";
import { isTrialPeriodExpired, trialDaysLeft } from "@/lib/subscriptions/subscription-utils";

export type BillingViewInput = {
  billingOn: boolean;
  billingExempt: boolean;
  status: string;
  periodEndIso: string | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
};

/** Everything the page needs to decide what to show, worked out from the subscription alone. */
export function deriveBillingView(input: BillingViewInput) {
  const hasStripeSubscription = Boolean(input.providerSubscriptionId);
  const hasStripeCustomer = Boolean(input.providerCustomerId);
  const trialAccessInput = {
    is_suspended: false,
    subscription_status: input.status,
    current_period_end: input.periodEndIso,
    provider_subscription_id: input.providerSubscriptionId,
  };
  const trialExpired = input.status === "trialing" && isTrialPeriodExpired(trialAccessInput);
  const checkoutInput = {
    billingEnabled: input.billingOn,
    billingExempt: input.billingExempt,
    hasStripeSubscription,
    status: input.status,
    trialExpired,
  };
  const showCheckout = needsStripeCheckout(checkoutInput);
  const offerCheckout = canOfferStripeCheckout(checkoutInput);
  return {
    hasStripeSubscription,
    hasStripeCustomer,
    trialExpired,
    showCheckout,
    offerCheckout,
    showCheckoutCta: showCheckout || offerCheckout,
    daysLeft: input.status === "trialing" ? trialDaysLeft(trialAccessInput) : null,
    showPortal: canManageStripeSubscription({
      billingEnabled: input.billingOn,
      hasStripeSubscription,
      hasStripeCustomer,
      status: input.status,
    }),
  };
}

export type BillingNoticeTone = "danger" | "warning" | "info";

export type BillingNotice = {
  tone: BillingNoticeTone;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  /** Set when the text counts days left of the trial. */
  days: number | null;
};

export type BillingNoticeInput = {
  billingOn: boolean;
  status: string;
  trialExpired: boolean;
  offerCheckout: boolean;
  hasStripeSubscription: boolean;
  isOwner: boolean;
  daysLeft: number | null;
};

/** The one message that asks for attention (billing off, trial over, payment failed, ...), or null. */
export function resolveBillingNotice(input: BillingNoticeInput): BillingNotice | null {
  const who = input.isOwner ? "Owner" : "Member";
  const pick = (name: string, tone: BillingNoticeTone, days: number | null = null): BillingNotice => ({
    tone,
    titleKey: `billing.attention.${name}Title` as TranslationKey,
    bodyKey: `billing.attention.${name}${who}` as TranslationKey,
    days,
  });

  if (!input.billingOn) {
    return {
      tone: "info",
      titleKey: "billing.attention.billingDisabledTitle",
      bodyKey: "billing.attention.billingDisabledBody",
      days: null,
    };
  }
  if (input.trialExpired) return pick("trialExpired", "danger");
  if (input.status === "past_due") return pick("pastDue", "danger");
  if (input.status === "incomplete") return pick("incomplete", "warning");

  if (input.offerCheckout && input.status === "trialing" && !input.hasStripeSubscription) {
    const days = input.daysLeft != null && input.daysLeft >= 0 ? input.daysLeft : null;
    const endingSoon = input.daysLeft != null && input.daysLeft <= 7;
    const bodyKey = `billing.attention.trial${who}${days != null ? "WithDays" : ""}` as TranslationKey;
    return {
      tone: endingSoon ? "warning" : "info",
      titleKey: endingSoon ? "billing.attention.trialEndingTitle" : "billing.attention.trialActiveTitle",
      bodyKey,
      days,
    };
  }
  if (input.status === "canceled") return pick("canceled", "info");
  return null;
}
