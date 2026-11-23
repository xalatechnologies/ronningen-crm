import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";

export type AdminOrgFilterStatus = "all" | "active" | "incomplete" | "suspended" | "past_due" | "canceled" | "enterprise";

export const ORG_FILTERS: readonly AdminOrgFilterStatus[] = ["all", "active", "incomplete", "suspended", "past_due", "canceled", "enterprise"];

/** Reads the status filter from the address bar; anything unknown means "all". */
export function parseOrgStatus(value: string | null | undefined): AdminOrgFilterStatus {
  return ORG_FILTERS.includes(value as AdminOrgFilterStatus) ? (value as AdminOrgFilterStatus) : "all";
}

/** Query string for the page; defaults (all, no search) are left out. */
export function buildOrgQuery(state: { status: AdminOrgFilterStatus; q: string }): string {
  const params = new URLSearchParams();
  if (state.status !== "all") params.set("status", state.status);
  if (state.q.trim()) params.set("q", state.q.trim());
  return params.toString();
}

export type AdminOrgOverviewStats = { total: number; active: number; needsFollowUp: number; totalRevenue: number; totalVenues: number };

export function computeOrgOverviewStats(
  organizations: readonly Pick<AdminOrganizationRow, "subscriptionStatus" | "isSuspended" | "totalRevenue" | "venueCount">[],
): AdminOrgOverviewStats {
  let active = 0;
  let needsFollowUp = 0;
  let totalRevenue = 0;
  let totalVenues = 0;
  for (const org of organizations) {
    totalRevenue += org.totalRevenue;
    totalVenues += org.venueCount;
    if (!org.isSuspended && ["active", "trialing"].includes(org.subscriptionStatus)) active += 1;
    if (org.isSuspended || org.subscriptionStatus === "incomplete" || org.subscriptionStatus === "past_due") needsFollowUp += 1;
  }
  return { total: organizations.length, active, needsFollowUp, totalRevenue, totalVenues };
}

export function computeOrgFilterCounts(
  organizations: readonly Pick<AdminOrganizationRow, "subscriptionStatus" | "subscriptionPlan" | "isSuspended">[],
): Record<AdminOrgFilterStatus, number> {
  const counts: Record<AdminOrgFilterStatus, number> = { all: organizations.length, active: 0, incomplete: 0, suspended: 0, past_due: 0, canceled: 0, enterprise: 0 };
  for (const org of organizations) {
    if (org.subscriptionPlan === "enterprise") counts.enterprise += 1;
    if (org.isSuspended) {
      counts.suspended += 1;
      continue;
    }
    if (org.subscriptionStatus === "incomplete") counts.incomplete += 1;
    else if (["active", "trialing"].includes(org.subscriptionStatus)) counts.active += 1;
    else if (org.subscriptionStatus === "past_due") counts.past_due += 1;
    else if (org.subscriptionStatus === "canceled") counts.canceled += 1;
  }
  return counts;
}

type Searchable = Pick<AdminOrganizationRow, "name" | "slug" | "subscriptionStatus" | "subscriptionPlan" | "isSuspended"> &
  Partial<Pick<AdminOrganizationRow, "billingEmail" | "contactEmail" | "orgNumber">>;

/** True when the organization passes the status filter and the search text (name, slug, e-mail addresses, org number). */
export function matchesOrgFilter(org: Searchable, search: string, status: AdminOrgFilterStatus): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = [org.name, org.slug, org.billingEmail, org.contactEmail, org.orgNumber].filter(Boolean).join(" ").toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  switch (status) {
    case "suspended":
      return org.isSuspended;
    case "active":
      return !org.isSuspended && ["active", "trialing"].includes(org.subscriptionStatus);
    case "incomplete":
      return !org.isSuspended && org.subscriptionStatus === "incomplete";
    case "past_due":
      return !org.isSuspended && org.subscriptionStatus === "past_due";
    case "canceled":
      return !org.isSuspended && org.subscriptionStatus === "canceled";
    case "enterprise":
      return org.subscriptionPlan === "enterprise";
    default:
      return true;
  }
}

export type OrgSortKey = "name" | "trialEnds" | "venueCount" | "totalRevenue" | "lastActivityAt";
export type SortDirection = "asc" | "desc";

/** A sorted copy. Missing values (no trial end, no activity) always go last, in either direction. */
export function sortOrganizations(rows: readonly AdminOrganizationRow[], key: OrgSortKey, direction: SortDirection): AdminOrganizationRow[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return a.name.localeCompare(b.name, "nb");
    if (av == null) return 1;
    if (bv == null) return -1;
    const diff = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "nb");
    return diff !== 0 ? sign * diff : a.name.localeCompare(b.name, "nb");
  });
}

export type TrialState = { kind: "none" } | { kind: "expired" | "soon" | "running"; days: number };

/** Where a trial stands: days left (soon = 7 or fewer), or expired. Whole days, counted in UTC dates. */
export function trialState(trialEnds: string | null, now: Date): TrialState {
  if (!trialEnds) return { kind: "none" };
  const end = new Date(trialEnds);
  if (Number.isNaN(end.getTime())) return { kind: "none" };
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((day(end) - day(now)) / 86_400_000);
  if (days < 0) return { kind: "expired", days };
  return { kind: days <= 7 ? "soon" : "running", days };
}

/** "3 days ago", "yesterday", "tomorrow", "in 12 days": whole days, in the viewer's language. */
export function relativeDays(iso: string | null, now: Date, locale: string): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round((day(then) - day(now)) / 86_400_000), "day");
}

export type BulkResult = { id: string; ok: boolean; error?: string };

/** What a bulk action did: how many worked, which ones failed, and the first error text. */
export function summarizeBulk(results: readonly BulkResult[]) {
  const failed = results.filter((r) => !r.ok);
  return { total: results.length, succeeded: results.length - failed.length, failedIds: failed.map((r) => r.id), firstError: failed.find((r) => r.error)?.error ?? null };
}
