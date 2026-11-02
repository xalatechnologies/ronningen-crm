import { describe, expect, it } from "vitest";

import { tenantQueryKeys } from "@/lib/queries/tenant-query-keys";

const ORG_A = "org-aaaa-1111";
const ORG_B = "org-bbbb-2222";

describe("tenantQueryKeys", () => {
  it("scopes dashboard by organization", () => {
    expect(tenantQueryKeys.dashboard(ORG_A)).toEqual([
      "tenant",
      "dashboard",
      ORG_A,
    ]);
    expect(tenantQueryKeys.dashboard(ORG_A)).not.toEqual(
      tenantQueryKeys.dashboard(ORG_B),
    );
  });

  it("scopes role-aware keys by org and role", () => {
    const ownerKey = tenantQueryKeys.bookings(ORG_A, "owner");
    const viewerKey = tenantQueryKeys.bookings(ORG_A, "viewer");
    expect(ownerKey).toEqual(["tenant", "bookings", ORG_A, "owner"]);
    expect(ownerKey).not.toEqual(viewerKey);
    expect(tenantQueryKeys.bookings(ORG_B, "owner")).not.toEqual(ownerKey);
  });

  it("scopes reports by org, year, and month", () => {
    expect(tenantQueryKeys.reports(ORG_A, 2026, 3)).toEqual([
      "tenant",
      "reports",
      ORG_A,
      2026,
      3,
    ]);
    expect(tenantQueryKeys.reports(ORG_A, "all", null)).toEqual([
      "tenant",
      "reports",
      ORG_A,
      "all",
      null,
    ]);
  });

  it("scopes overnatting by year-month string", () => {
    expect(tenantQueryKeys.overnatting(ORG_A, "2026-06", "manager")).toEqual([
      "tenant",
      "overnatting",
      ORG_A,
      "2026-06",
      "manager",
    ]);
  });

  it("all keys share tenant root", () => {
    expect(tenantQueryKeys.all).toEqual(["tenant"]);
    expect(tenantQueryKeys.dashboard(ORG_A)[0]).toBe("tenant");
    expect(tenantQueryKeys.customers(ORG_A)[0]).toBe("tenant");
  });
});
