import { describe, expect, it } from "vitest";

import {
  buildOrgQuery,
  computeOrgFilterCounts,
  computeOrgOverviewStats,
  matchesOrgFilter,
  parseOrgStatus,
  relativeDays,
  sortOrganizations,
  summarizeBulk,
  trialState,
} from "@/features/admin-organizations/lib/org-list";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";

const NOW = new Date("2026-11-23T12:00:00Z");

const org = (id: string, over: Partial<AdminOrganizationRow> = {}): AdminOrganizationRow =>
  ({
    id,
    name: `Org ${id}`,
    slug: `slug-${id}`,
    subscriptionStatus: "active",
    subscriptionPlan: "standard",
    isSuspended: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberCount: 1,
    venueCount: 0,
    trialEnds: null,
    providerSubscriptionId: "sub_1",
    lastActivityAt: null,
    totalRevenue: 0,
    unpaidRemaining: 0,
    bookingsLast30d: 0,
    health: { score: 100, tier: "healthy", factors: [] },
    billingEmail: null,
    contactEmail: null,
    orgNumber: null,
    ...over,
  }) as AdminOrganizationRow;

describe("address bar", () => {
  it("parses a known status and treats anything else as all", () => {
    expect(parseOrgStatus("past_due")).toBe("past_due");
    expect(parseOrgStatus("enterprise")).toBe("enterprise");
    expect(parseOrgStatus("x")).toBe("all");
    expect(parseOrgStatus(null)).toBe("all");
  });

  it("builds a query without defaults", () => {
    expect(buildOrgQuery({ status: "all", q: " " })).toBe("");
    expect(buildOrgQuery({ status: "suspended", q: " ron " })).toBe("status=suspended&q=ron");
  });
});

describe("counts and overview", () => {
  const rows = [
    org("a"),
    org("b", { subscriptionStatus: "trialing", venueCount: 2, totalRevenue: 100 }),
    org("c", { isSuspended: true, subscriptionStatus: "active" }),
    org("d", { subscriptionStatus: "past_due" }),
    org("e", { subscriptionStatus: "incomplete", subscriptionPlan: "enterprise" }),
    org("f", { subscriptionStatus: "canceled" }),
  ];

  it("counts each filter; a suspended organization counts only as suspended", () => {
    expect(computeOrgFilterCounts(rows)).toEqual({ all: 6, active: 2, incomplete: 1, suspended: 1, past_due: 1, canceled: 1, enterprise: 1 });
  });

  it("sums revenue and venues and counts those that need follow-up", () => {
    expect(computeOrgOverviewStats(rows)).toEqual({ total: 6, active: 2, needsFollowUp: 3, totalRevenue: 100, totalVenues: 2 });
  });
});

describe("matchesOrgFilter", () => {
  const o = org("a", { name: "Rønningen", billingEmail: "Bill@x.no", orgNumber: "974760673" });

  it("searches name, slug, e-mails and org number, ignoring case", () => {
    for (const q of ["rønn", "SLUG-A", "bill@", "9747"]) expect(matchesOrgFilter(o, q, "all"), q).toBe(true);
    expect(matchesOrgFilter(o, "oslo", "all")).toBe(false);
  });

  it("applies the status filter", () => {
    expect(matchesOrgFilter(o, "", "active")).toBe(true);
    expect(matchesOrgFilter(o, "", "suspended")).toBe(false);
    expect(matchesOrgFilter({ ...o, isSuspended: true }, "", "active")).toBe(false);
    expect(matchesOrgFilter({ ...o, isSuspended: true }, "", "suspended")).toBe(true);
    expect(matchesOrgFilter({ ...o, subscriptionPlan: "enterprise" }, "", "enterprise")).toBe(true);
    expect(matchesOrgFilter({ ...o, subscriptionStatus: "past_due" }, "", "past_due")).toBe(true);
  });
});

describe("sortOrganizations", () => {
  const rows = [
    org("a", { name: "Bergen", totalRevenue: 50, lastActivityAt: "2026-11-01T00:00:00Z" }),
    org("b", { name: "Åsgård", totalRevenue: 300, lastActivityAt: null }),
    org("c", { name: "Alta", totalRevenue: 100, lastActivityAt: "2026-11-20T00:00:00Z" }),
  ];

  it("sorts by name in Norwegian order and by numbers", () => {
    expect(sortOrganizations(rows, "name", "asc").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortOrganizations(rows, "totalRevenue", "desc").map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(sortOrganizations(rows, "totalRevenue", "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("puts missing values last in both directions", () => {
    expect(sortOrganizations(rows, "lastActivityAt", "desc").map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(sortOrganizations(rows, "lastActivityAt", "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("does not change the list it is given", () => {
    const copy = [...rows];
    sortOrganizations(rows, "name", "desc");
    expect(rows).toEqual(copy);
  });
});

describe("trialState", () => {
  it("has no state without a date", () => {
    expect(trialState(null, NOW)).toEqual({ kind: "none" });
    expect(trialState("nope", NOW)).toEqual({ kind: "none" });
  });

  it("is expired before today, soon within 7 days (today included), otherwise running", () => {
    expect(trialState("2026-11-22T10:00:00Z", NOW)).toEqual({ kind: "expired", days: -1 });
    expect(trialState("2026-11-23T23:00:00Z", NOW)).toEqual({ kind: "soon", days: 0 });
    expect(trialState("2026-11-30T10:00:00Z", NOW)).toEqual({ kind: "soon", days: 7 });
    expect(trialState("2026-12-05T10:00:00Z", NOW)).toEqual({ kind: "running", days: 12 });
  });
});

describe("relativeDays", () => {
  it("is null without a date", () => {
    expect(relativeDays(null, NOW, "nb")).toBeNull();
  });

  it("speaks in whole days, past and future", () => {
    expect(relativeDays("2026-11-22T10:00:00Z", NOW, "nb")).toMatch(/i går/);
    expect(relativeDays("2026-11-20T10:00:00Z", NOW, "nb")).toMatch(/3 døgn siden|3 dager siden/);
    expect(relativeDays("2026-12-05T10:00:00Z", NOW, "nb")).toMatch(/12 døgn|12 dager/);
  });
});

describe("summarizeBulk", () => {
  it("counts successes and lists the failures with the first error", () => {
    const summary = summarizeBulk([{ id: "a", ok: true }, { id: "b", ok: false, error: "Nei" }, { id: "c", ok: false }]);
    expect(summary).toEqual({ total: 3, succeeded: 1, failedIds: ["b", "c"], firstError: "Nei" });
  });

  it("is all good for an empty or fully successful list", () => {
    expect(summarizeBulk([])).toMatchObject({ total: 0, failedIds: [] });
    expect(summarizeBulk([{ id: "a", ok: true }]).failedIds).toEqual([]);
  });
});
