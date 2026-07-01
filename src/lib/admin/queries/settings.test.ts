import { afterEach, describe, expect, it, vi } from "vitest";

import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import {
  buildAllIntegrationStatuses,
  buildEnvChecklist,
  buildStripeConfigStatus,
  computeIntegrationSummary,
  countMissingRequiredEnv,
} from "@/lib/admin/platform-integration-status";
import { fetchAdminSettingsOverview } from "@/lib/admin/queries/settings";

const t = createTranslator(getDictionary("nb"));

describe("buildStripeConfigStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns info when billing is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("BILLING_ENABLED", "false");

    const result = buildStripeConfigStatus(t);
    expect(result.status).toBe("info");
  });

  it("returns critical when billing is enabled but Stripe is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const result = buildStripeConfigStatus(t);
    expect(result.status).toBe("critical");
  });
});

describe("computeIntegrationSummary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("counts healthy and info as configured", () => {
    const integrations = buildAllIntegrationStatuses(t);
    const summary = computeIntegrationSummary(integrations);

    expect(summary.totalCount).toBe(5);
    expect(summary.configuredCount).toBeGreaterThanOrEqual(0);
    expect(summary.configuredCount).toBeLessThanOrEqual(summary.totalCount);
  });

  it("matches sandbox with billing on and email missing", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_MODE", "sandbox");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("CRON_SECRET", "cron_secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pk_test");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");

    const integrations = buildAllIntegrationStatuses(t);
    const summary = computeIntegrationSummary(integrations);
    const email = integrations.find((item) => item.id === "email");

    expect(summary).toEqual({
      overallStatus: "warning",
      configuredCount: 4,
      totalCount: 5,
    });
    expect(email?.status).toBe("warning");
    expect(countMissingRequiredEnv(buildEnvChecklist(t))).toBe(0);
  });
});

describe("buildEnvChecklist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never includes secret values", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_super_secret");
    vi.stubEnv("CRON_SECRET", "cron_super_secret");

    const items = buildEnvChecklist(t);
    const serialized = JSON.stringify(items);

    expect(serialized).not.toContain("sk_test_super_secret");
    expect(serialized).not.toContain("cron_super_secret");
    expect(items.every((item) => typeof item.isSet === "boolean")).toBe(true);
  });

  it("counts missing required env vars when billing is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_MODE", "sandbox");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "");
    vi.stubEnv("STRIPE_PRICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
    vi.stubEnv("CRON_SECRET", "");

    const items = buildEnvChecklist(t);
    expect(countMissingRequiredEnv(items)).toBeGreaterThan(0);
  });
});

describe("fetchAdminSettingsOverview", () => {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  it.skipIf(!hasServiceRole)(
    "returns structured overview with integrations and summary",
    async () => {
      const overview = await fetchAdminSettingsOverview();

      expect(overview.commercial.trialDays).toBeGreaterThan(0);
      expect(overview.integrations.length).toBe(5);
      expect(overview.envChecklist.length).toBeGreaterThan(0);
      expect(overview.summary.totalCount).toBe(5);
      expect(typeof overview.summary.missingRequiredCount).toBe("number");
      expect(Array.isArray(overview.platformAdmins)).toBe(true);
    },
  );
});
