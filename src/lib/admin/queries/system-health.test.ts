import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCronHealthComponent,
  buildStripeHealthComponent,
  computeOverallStatus,
  fetchAdminSystemHealthOverview,
  type SystemHealthComponent,
} from "@/lib/admin/queries/system-health";

describe("computeOverallStatus", () => {
  it("returns healthy when all components are healthy or info", () => {
    const components: SystemHealthComponent[] = [
      { id: "a", label: "A", status: "healthy", detail: "" },
      { id: "b", label: "B", status: "info", detail: "" },
    ];
    expect(computeOverallStatus(components)).toBe("healthy");
  });

  it("returns worst status across components", () => {
    const components: SystemHealthComponent[] = [
      { id: "a", label: "A", status: "healthy", detail: "" },
      { id: "b", label: "B", status: "warning", detail: "" },
      { id: "c", label: "C", status: "critical", detail: "" },
    ];
    expect(computeOverallStatus(components)).toBe("critical");
  });
});

describe("buildStripeHealthComponent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns info when billing is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");
    vi.stubEnv("BILLING_ENABLED", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const result = buildStripeHealthComponent(null);
    expect(result.status).toBe("info");
    expect(result.detail).toContain("deaktivert");
  });

  it("returns critical when billing is enabled but Stripe is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const result = buildStripeHealthComponent(null);
    expect(result.status).toBe("critical");
  });

  it("returns warning when Stripe is configured but no webhooks yet", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_STANDARD", "price_x");
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    const result = buildStripeHealthComponent(null);
    expect(result.status).toBe("warning");
    expect(result.detail).toContain("Ingen webhooks");
  });
});

describe("buildCronHealthComponent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("warns when CRON_SECRET is missing in dev", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "false");

    const result = buildCronHealthComponent(null);
    expect(result.status).toBe("warning");
    expect(result.detail).toContain("CRON_SECRET");
  });

  it("is critical when CRON_SECRET is missing with billing enabled", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_BILLING_ENABLED", "true");

    const result = buildCronHealthComponent(null);
    expect(result.status).toBe("critical");
  });

  it("warns when waiting for first completed run", () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const result = buildCronHealthComponent(null);
    expect(result.status).toBe("warning");
    expect(result.detail).toContain("første kjøring");
  });

  it("is critical when last run failed", () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const result = buildCronHealthComponent({
      status: "failed",
      finished_at: new Date().toISOString(),
    });
    expect(result.status).toBe("critical");
  });

  it("warns when last run is stale", () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const stale = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const result = buildCronHealthComponent({
      status: "success",
      finished_at: stale,
    });
    expect(result.status).toBe("warning");
    expect(result.detail).toContain("for gammel");
  });
});

const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasServiceRole)("fetchAdminSystemHealthOverview integration", () => {
  it("returns four infrastructure components and valid summary", async () => {
    const data = await fetchAdminSystemHealthOverview();

    expect(data.components).toHaveLength(4);
    expect(data.components.map((c) => c.id)).toEqual([
      "database",
      "auth",
      "stripe",
      "cron",
    ]);
    expect(data.summary.total).toBe(4);
    expect(data.summary.healthy + data.summary.warning + data.summary.critical).toBe(
      4,
    );
    expect(data.openSupportCount).toBeGreaterThanOrEqual(0);
    expect(data.openSupportQueue.length).toBeLessThanOrEqual(6);
    expect(["healthy", "info", "warning", "critical"]).toContain(
      data.overallStatus,
    );
  });
});
