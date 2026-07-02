import { describe, expect, it } from "vitest";

import {
  canAccessApp,
  isAllowedWhenBillingBlocked,
  isTrialPeriodExpired,
  resolveTenantAccess,
} from "@/lib/subscriptions/subscription-utils";

const pastPeriodEnd = new Date(Date.now() - 86_400_000).toISOString();
const futurePeriodEnd = new Date(Date.now() + 86_400_000).toISOString();

describe("resolveTenantAccess", () => {
  it("grants full access for valid trialing org", () => {
    expect(
      resolveTenantAccess({
        is_suspended: false,
        subscription_status: "trialing",
        current_period_end: futurePeriodEnd,
        provider_subscription_id: "sub_123",
      }),
    ).toBe("full");
  });

  it("locks Stripe trialing org when trial period has ended", () => {
    expect(
      resolveTenantAccess({
        is_suspended: false,
        subscription_status: "trialing",
        current_period_end: pastPeriodEnd,
        provider_subscription_id: "sub_123",
      }),
    ).toBe("billing_only");
  });

  it("locks past_due org immediately", () => {
    expect(
      resolveTenantAccess({
        is_suspended: false,
        subscription_status: "past_due",
        current_period_end: futurePeriodEnd,
        provider_subscription_id: "sub_123",
      }),
    ).toBe("billing_only");
  });

  it("locks legacy trial without Stripe when period has ended", () => {
    expect(
      resolveTenantAccess({
        is_suspended: false,
        subscription_status: "trialing",
        current_period_end: pastPeriodEnd,
        provider_subscription_id: null,
      }),
    ).toBe("billing_only");
  });

  it("suspension overrides subscription status", () => {
    expect(
      resolveTenantAccess({
        is_suspended: true,
        subscription_status: "active",
        current_period_end: futurePeriodEnd,
      }),
    ).toBe("suspended");
  });

  it("grants full access for active local trial when billing is enabled", () => {
    expect(
      resolveTenantAccess(
        {
          is_suspended: false,
          subscription_status: "trialing",
          current_period_end: futurePeriodEnd,
          provider_subscription_id: null,
        },
        { billingEnabled: true },
      ),
    ).toBe("full");
  });

  it("allows legacy trial when billing is disabled", () => {
    expect(
      resolveTenantAccess(
        {
          is_suspended: false,
          subscription_status: "trialing",
          current_period_end: futurePeriodEnd,
          provider_subscription_id: null,
        },
        { billingEnabled: false },
      ),
    ).toBe("full");
  });

  it("grants full access for billing-exempt org regardless of trial or Stripe", () => {
    expect(
      resolveTenantAccess(
        {
          is_suspended: false,
          subscription_status: "canceled",
          current_period_end: pastPeriodEnd,
          provider_subscription_id: null,
          billing_exempt: true,
        },
        { billingEnabled: true },
      ),
    ).toBe("full");
  });

  it("still suspends billing-exempt org when suspended", () => {
    expect(
      resolveTenantAccess({
        is_suspended: true,
        subscription_status: "active",
        billing_exempt: true,
      }),
    ).toBe("suspended");
  });
});

describe("isAllowedWhenBillingBlocked", () => {
  it("allows billing, support, account, and onboarding", () => {
    expect(isAllowedWhenBillingBlocked("/app/settings/billing")).toBe(true);
    expect(isAllowedWhenBillingBlocked("/app/settings/support")).toBe(true);
    expect(isAllowedWhenBillingBlocked("/app/settings/account")).toBe(true);
    expect(isAllowedWhenBillingBlocked("/app/onboarding")).toBe(true);
    expect(isAllowedWhenBillingBlocked("/app/dashboard")).toBe(false);
  });
});

describe("canAccessApp", () => {
  it("maps past_due to billing_only", () => {
    expect(canAccessApp("past_due")).toBe("billing_only");
  });
});

describe("isTrialPeriodExpired", () => {
  it("returns true when trialing and period end is in the past", () => {
    expect(
      isTrialPeriodExpired({
        is_suspended: false,
        subscription_status: "trialing",
        current_period_end: pastPeriodEnd,
        provider_subscription_id: "sub_123",
      }),
    ).toBe(true);
  });

  it("returns false when trialing and period end is in the future", () => {
    expect(
      isTrialPeriodExpired({
        is_suspended: false,
        subscription_status: "trialing",
        current_period_end: futurePeriodEnd,
        provider_subscription_id: null,
      }),
    ).toBe(false);
  });
});
