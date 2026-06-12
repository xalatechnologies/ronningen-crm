import { describe, expect, it } from "vitest";

import {
  canManageStripeSubscription,
  needsStripeCheckout,
} from "@/lib/billing/billing-ui-state";

describe("needsStripeCheckout", () => {
  it("returns false when billing is disabled", () => {
    expect(
      needsStripeCheckout({
        billingEnabled: false,
        hasStripeSubscription: false,
        status: "incomplete",
        trialExpired: false,
      }),
    ).toBe(false);
  });

  it("returns true for incomplete org without Stripe sub", () => {
    expect(
      needsStripeCheckout({
        billingEnabled: true,
        hasStripeSubscription: false,
        status: "incomplete",
        trialExpired: false,
      }),
    ).toBe(true);
  });

  it("returns true for legacy trialing org without Stripe sub", () => {
    expect(
      needsStripeCheckout({
        billingEnabled: true,
        hasStripeSubscription: false,
        status: "trialing",
        trialExpired: false,
      }),
    ).toBe(true);
  });

  it("returns false when Stripe subscription exists", () => {
    expect(
      needsStripeCheckout({
        billingEnabled: true,
        hasStripeSubscription: true,
        status: "incomplete",
        trialExpired: false,
      }),
    ).toBe(false);
  });
});

describe("canManageStripeSubscription", () => {
  it("allows portal when subscription exists", () => {
    expect(
      canManageStripeSubscription({
        billingEnabled: true,
        hasStripeSubscription: true,
        hasStripeCustomer: true,
        status: "active",
      }),
    ).toBe(true);
  });

  it("allows portal for past_due with customer only", () => {
    expect(
      canManageStripeSubscription({
        billingEnabled: true,
        hasStripeSubscription: false,
        hasStripeCustomer: true,
        status: "past_due",
      }),
    ).toBe(true);
  });
});
