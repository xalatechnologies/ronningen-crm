import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertBillingConfigured,
  getBillingMode,
  getStripeModeLabel,
  isBillingEnabled,
  isSandboxBilling,
  isStripeConfigured,
  resolveStripePriceId,
} from "@/lib/billing/billing-env";

describe("billing-env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults billing mode to sandbox", () => {
    expect(getBillingMode()).toBe("sandbox");
    expect(isSandboxBilling()).toBe(true);
    expect(getStripeModeLabel()).toBe("Testmiljø");
  });

  it("resolves live mode from BILLING_MODE", () => {
    vi.stubEnv("BILLING_MODE", "live");
    expect(getBillingMode()).toBe("live");
    expect(isSandboxBilling()).toBe(false);
    expect(getStripeModeLabel()).toBe("Produksjon");
  });

  it("prefers STRIPE_PRICE_STANDARD over STRIPE_PRICE_ID", () => {
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_standard");
    vi.stubEnv("STRIPE_PRICE_ID", "price_legacy");
    expect(resolveStripePriceId()).toBe("price_standard");
  });

  it("falls back to STRIPE_PRICE_ID", () => {
    vi.stubEnv("STRIPE_PRICE_ID", "price_legacy");
    expect(resolveStripePriceId()).toBe("price_legacy");
  });

  it("requires webhook secret when billing is enabled", () => {
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    expect(isStripeConfigured()).toBe(false);
    expect(assertBillingConfigured().ok).toBe(false);
  });

  it("passes assertBillingConfigured when fully set", () => {
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");

    expect(isBillingEnabled()).toBe(true);
    expect(isStripeConfigured()).toBe(true);
    expect(assertBillingConfigured().ok).toBe(true);
  });

  it("rejects live secret key when BILLING_MODE is sandbox", () => {
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_MODE", "sandbox");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");

    const result = assertBillingConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sk_test_");
    }
  });

  it("rejects test secret key when BILLING_MODE is live", () => {
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_MODE", "live");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_live_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");

    const result = assertBillingConfigured();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sk_live_");
    }
  });
});
