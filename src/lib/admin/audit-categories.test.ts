import { describe, expect, it } from "vitest";

import {
  computeAuditCategoryCounts,
  matchesAuditCategory,
  platformAuditOrFilter,
  resolveAuditCategory,
} from "@/lib/admin/audit-categories";

describe("resolveAuditCategory", () => {
  it("classifies organization actions", () => {
    expect(resolveAuditCategory("organization.suspended")).toBe("organization");
    expect(resolveAuditCategory("organization.notes_updated")).toBe(
      "organization",
    );
  });

  it("classifies subscription actions separately", () => {
    expect(resolveAuditCategory("organization.subscription_updated")).toBe(
      "subscription",
    );
    expect(resolveAuditCategory("subscription.canceled")).toBe("subscription");
  });

  it("classifies user and support actions", () => {
    expect(resolveAuditCategory("user.disabled")).toBe("users");
    expect(resolveAuditCategory("support.ticket_created")).toBe("support");
  });

  it("classifies platform actions", () => {
    expect(resolveAuditCategory("impersonation.started")).toBe("platform");
    expect(resolveAuditCategory("export.audit_csv")).toBe("platform");
    expect(resolveAuditCategory("notification.template_upserted")).toBe(
      "platform",
    );
  });
});

describe("platformAuditOrFilter", () => {
  it("includes notification actions in the platform filter", () => {
    expect(platformAuditOrFilter()).toContain("action.like.notification.%");
  });
});

describe("matchesAuditCategory", () => {
  it("matches all category", () => {
    expect(matchesAuditCategory("user.disabled", "all")).toBe(true);
  });

  it("filters by specific category", () => {
    expect(matchesAuditCategory("user.disabled", "users")).toBe(true);
    expect(matchesAuditCategory("user.disabled", "support")).toBe(false);
  });
});

describe("computeAuditCategoryCounts", () => {
  it("aggregates counts per category", () => {
    const counts = computeAuditCategoryCounts([
      { action: "organization.suspended", count: 2 },
      { action: "organization.subscription_updated", count: 3 },
      { action: "user.disabled", count: 1 },
    ]);

    expect(counts.all).toBe(6);
    expect(counts.organization).toBe(2);
    expect(counts.subscription).toBe(3);
    expect(counts.users).toBe(1);
  });
});
