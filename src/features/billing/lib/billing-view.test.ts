import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveBillingView, resolveBillingNotice, type BillingViewInput } from "@/features/billing/lib/billing-view";

const NOW = new Date("2026-11-23T12:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const base: BillingViewInput = {
  billingOn: true,
  billingExempt: false,
  status: "trialing",
  periodEndIso: inDays(12),
  providerSubscriptionId: null,
  providerCustomerId: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("deriveBillingView", () => {
  it("offers optional checkout during a running local trial", () => {
    const v = deriveBillingView(base);
    expect(v).toMatchObject({ trialExpired: false, showCheckout: false, offerCheckout: true, showCheckoutCta: true, showPortal: false });
    expect(v.daysLeft).toBe(12);
  });

  it("requires checkout once the trial has ended", () => {
    const v = deriveBillingView({ ...base, periodEndIso: inDays(-1) });
    expect(v).toMatchObject({ trialExpired: true, showCheckout: true, offerCheckout: false });
    expect(v.daysLeft).toBe(-1);
  });

  it("offers the Stripe portal and no checkout when a Stripe subscription exists", () => {
    const v = deriveBillingView({ ...base, status: "active", providerSubscriptionId: "sub_1", providerCustomerId: "cus_1" });
    expect(v).toMatchObject({ showPortal: true, showCheckoutCta: false, hasStripeSubscription: true });
    expect(v.daysLeft).toBeNull();
  });

  it("offers the portal for a past-due customer without a subscription id", () => {
    expect(deriveBillingView({ ...base, status: "past_due", providerCustomerId: "cus_1" }).showPortal).toBe(true);
  });

  it("offers nothing for an exempt organization or when billing is off", () => {
    expect(deriveBillingView({ ...base, billingExempt: true }).showCheckoutCta).toBe(false);
    expect(deriveBillingView({ ...base, billingOn: false })).toMatchObject({ showCheckoutCta: false, showPortal: false });
  });
});

const notice = (over: Partial<Parameters<typeof resolveBillingNotice>[0]> = {}) =>
  resolveBillingNotice({
    billingOn: true,
    status: "trialing",
    trialExpired: false,
    offerCheckout: true,
    hasStripeSubscription: false,
    isOwner: true,
    daysLeft: 20,
    ...over,
  });

describe("resolveBillingNotice", () => {
  it("says billing is off first", () => {
    expect(notice({ billingOn: false })).toMatchObject({ tone: "info", titleKey: "billing.attention.billingDisabledTitle" });
  });

  it("is a danger for an expired trial, with owner and member wording", () => {
    expect(notice({ trialExpired: true })).toMatchObject({ tone: "danger", bodyKey: "billing.attention.trialExpiredOwner" });
    expect(notice({ trialExpired: true, isOwner: false })?.bodyKey).toBe("billing.attention.trialExpiredMember");
  });

  it("covers past due, incomplete and canceled", () => {
    expect(notice({ status: "past_due", offerCheckout: false })).toMatchObject({ tone: "danger", titleKey: "billing.attention.pastDueTitle" });
    expect(notice({ status: "incomplete", offerCheckout: false })).toMatchObject({ tone: "warning", titleKey: "billing.attention.incompleteTitle" });
    expect(notice({ status: "canceled", offerCheckout: false })).toMatchObject({ tone: "info", titleKey: "billing.attention.canceledTitle" });
  });

  it("is calm early in the trial and a warning in the last 7 days", () => {
    expect(notice({ daysLeft: 20 })).toMatchObject({ tone: "info", titleKey: "billing.attention.trialActiveTitle", bodyKey: "billing.attention.trialOwnerWithDays", days: 20 });
    expect(notice({ daysLeft: 7 })).toMatchObject({ tone: "warning", titleKey: "billing.attention.trialEndingTitle" });
  });

  it("uses the no-days wording when the end date is unknown", () => {
    expect(notice({ daysLeft: null })).toMatchObject({ bodyKey: "billing.attention.trialOwner", days: null });
    expect(notice({ daysLeft: null, isOwner: false })?.bodyKey).toBe("billing.attention.trialMember");
  });

  it("shows nothing for a healthy active subscription", () => {
    expect(notice({ status: "active", offerCheckout: false, hasStripeSubscription: true })).toBeNull();
  });
});
