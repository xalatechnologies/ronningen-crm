/**
 * Acceptance matrix for local 30-day trial before Stripe (plan verification).
 * Maps each plan requirement to automated assertions.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getInitialSubscriptionStatus,
  getInitialTrialPeriodBounds,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";
import {
  canOfferStripeCheckout,
  needsStripeCheckout,
} from "@/lib/billing/billing-ui-state";
import { resolveRemainingTrialDays } from "@/lib/billing/resolve-stripe-trial-days";
import {
  isBillingOnlyAccess,
  isTrialPeriodExpired,
  resolveTenantAccess,
  shouldShowTrialEndingWarning,
  trialDaysLeft,
} from "@/lib/subscriptions/subscription-utils";

const DAY_MS = 86_400_000;

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

const localTrialActive = {
  is_suspended: false,
  subscription_status: "trialing" as const,
  current_period_end: isoDaysFromNow(20),
  provider_subscription_id: null,
};

const localTrialExpired = {
  ...localTrialActive,
  current_period_end: isoDaysFromNow(-1),
};

const billingOn = { billingEnabled: true as const };

describe("local trial billing — plan acceptance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("1. Org creation defaults", () => {
    it("starts as trialing when billing is enabled", () => {
      vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
      expect(getInitialSubscriptionStatus()).toBe("trialing");
    });

    it("uses default trialing when billing is disabled", () => {
      expect(getInitialSubscriptionStatus()).toBe("trialing");
    });

    it("sets trial window to SAAS_TRIAL_DAYS", () => {
      const { start, end } = getInitialTrialPeriodBounds();
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      const spanDays = Math.round((endMs - startMs) / DAY_MS);
      expect(spanDays).toBe(SAAS_TRIAL_DAYS);
    });
  });

  describe("3. Access control during local trial", () => {
    it("grants full app access for active local trial with billing on", () => {
      expect(resolveTenantAccess(localTrialActive, billingOn)).toBe("full");
      expect(isBillingOnlyAccess(localTrialActive, billingOn)).toBe(false);
    });

    it("blocks app after local trial expires (before cron moves status)", () => {
      expect(resolveTenantAccess(localTrialExpired, billingOn)).toBe(
        "billing_only",
      );
      expect(isBillingOnlyAccess(localTrialExpired, billingOn)).toBe(true);
    });

    it("blocks incomplete orgs without Stripe when billing is on", () => {
      expect(
        resolveTenantAccess(
          {
            is_suspended: false,
            subscription_status: "incomplete",
            current_period_end: null,
            provider_subscription_id: null,
          },
          billingOn,
        ),
      ).toBe("billing_only");
    });

    it("blocks legacy active orgs without Stripe when billing is on", () => {
      expect(
        resolveTenantAccess(
          {
            is_suspended: false,
            subscription_status: "active",
            current_period_end: isoDaysFromNow(30),
            provider_subscription_id: null,
          },
          billingOn,
        ),
      ).toBe("billing_only");
    });

    it("keeps full access for Stripe-connected trialing orgs", () => {
      expect(
        resolveTenantAccess(
          {
            ...localTrialActive,
            provider_subscription_id: "sub_stripe",
          },
          billingOn,
        ),
      ).toBe("full");
    });
  });

  describe("4. Billing UI checkout states", () => {
    it("does not require checkout during active local trial", () => {
      expect(
        needsStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired: false,
        }),
      ).toBe(false);
    });

    it("requires checkout when trial expired", () => {
      expect(
        needsStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired: true,
        }),
      ).toBe(true);
    });

    it("offers optional checkout during active local trial only", () => {
      expect(
        canOfferStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired: false,
        }),
      ).toBe(true);
      expect(
        canOfferStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired: true,
        }),
      ).toBe(false);
      expect(
        canOfferStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "incomplete",
          trialExpired: false,
        }),
      ).toBe(false);
    });
  });

  describe("5. Trial ending warnings (7-day window)", () => {
    it("shows warning within 7 days of expiry", () => {
      expect(
        shouldShowTrialEndingWarning({
          ...localTrialActive,
          current_period_end: isoDaysFromNow(7),
        }),
      ).toBe(true);
      expect(
        shouldShowTrialEndingWarning({
          ...localTrialActive,
          current_period_end: isoDaysFromNow(1),
        }),
      ).toBe(true);
    });

    it("hides warning more than 7 days before expiry", () => {
      expect(
        shouldShowTrialEndingWarning({
          ...localTrialActive,
          current_period_end: isoDaysFromNow(8),
        }),
      ).toBe(false);
    });

    it("hides warning after expiry", () => {
      expect(shouldShowTrialEndingWarning(localTrialExpired)).toBe(false);
    });

    it("hides warning when period end is missing", () => {
      expect(
        shouldShowTrialEndingWarning({
          ...localTrialActive,
          current_period_end: null,
        }),
      ).toBe(false);
    });
  });

  describe("8. Stripe checkout handoff trial days", () => {
    it("passes remaining local trial days to Stripe", () => {
      expect(resolveRemainingTrialDays(isoDaysFromNow(12))).toBe(12);
    });

    it("omits Stripe trial when local trial expired", () => {
      expect(resolveRemainingTrialDays(isoDaysFromNow(-2))).toBe(0);
    });
  });

  describe("Cross-cutting invariants", () => {
    it("active trial: full access + optional checkout + no required checkout", () => {
      const trialExpired = isTrialPeriodExpired(localTrialActive);
      expect(trialExpired).toBe(false);
      expect(resolveTenantAccess(localTrialActive, billingOn)).toBe("full");
      expect(
        needsStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired,
        }),
      ).toBe(false);
      expect(
        canOfferStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired,
        }),
      ).toBe(true);
    });

    it("expired trial: billing lock + required checkout + no optional checkout", () => {
      const trialExpired = isTrialPeriodExpired(localTrialExpired);
      expect(trialExpired).toBe(true);
      expect(resolveTenantAccess(localTrialExpired, billingOn)).toBe(
        "billing_only",
      );
      expect(
        needsStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired,
        }),
      ).toBe(true);
      expect(
        canOfferStripeCheckout({
          billingEnabled: true,
          hasStripeSubscription: false,
          status: "trialing",
          trialExpired,
        }),
      ).toBe(false);
    });

    it("trialDaysLeft aligns with expiry detection", () => {
      const days = trialDaysLeft({
        ...localTrialActive,
        current_period_end: isoDaysFromNow(5),
      });
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(6);
    });
  });
});
