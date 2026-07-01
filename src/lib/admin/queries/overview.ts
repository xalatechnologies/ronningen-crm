import { computeRevenueMetrics } from "@/lib/admin/revenue-metrics";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { AdminQueueItem, RevenueMetrics } from "@/lib/admin/types";
import type { TrendPoint } from "@/components/admin/admin-trend-chart";
import { adminRoutes } from "@/config/admin-routes";
import { fetchAdminSubscriptionAnalytics } from "@/lib/admin/queries/users-billing-audit";
import {
  buildDailyNewOrgsTrend,
  buildFailedPaymentQueue,
  buildMonthlyTrend,
  buildPeriodEndByOrg,
  buildTrialExpiringQueue,
} from "@/lib/admin/trend-data";

async function fetchActiveUsers30d(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  since: string,
): Promise<number> {
  try {
    const { data, error } = await admin
      .from("platform_login_events")
      .select("user_id")
      .gte("created_at", since);
    if (error) return 0;
    return new Set((data ?? []).map((row) => row.user_id)).size;
  } catch {
    return 0;
  }
}

export type AdminOverviewStats = {
  organizationCount: number;
  userCount: number;
  suspendedCount: number;
  newOrganizationsLast7Days: number;
  statusCounts: Record<string, number>;
  bookingsLast30Days: number;
  inquiriesLast30Days: number;
  revenue: RevenueMetrics;
  activeUsers30d: number;
  recentOrganizations: {
    id: string;
    name: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    createdAt: string;
  }[];
  trialExpiringQueue: AdminQueueItem[];
  failedPaymentQueue: AdminQueueItem[];
  suspendedOrganizations: AdminQueueItem[];
  recentAuditEntries: {
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
    actorName: string | null;
  }[];
  revenueTrend: TrendPoint[];
  newTenantsTrend: TrendPoint[];
};

export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  const admin = createSupabaseAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since7 = sevenDaysAgo.toISOString();
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const trialCutoff = fourteenDaysFromNow.toISOString();

  const [
    { count: organizationCount },
    { count: userCount },
    { count: suspendedCount },
    { count: newOrganizationsLast7Days },
    { data: orgs },
    { count: bookingsLast30Days },
    { count: inquiriesLast30Days },
    { data: auditEntries },
    { data: subscriptions },
    subscriptionAnalytics,
    activeUsers30d,
  ] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("is_suspended", true),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7),
    admin
      .from("organizations")
      .select(
        "id, name, subscription_status, subscription_plan, is_suspended, created_at, billing_email",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("booking_inquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    admin
      .from("platform_audit_log")
      .select("id, action, target_type, target_id, created_at, actor_user_id")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("subscriptions")
      .select("organization_id, current_period_end, status")
      .order("created_at", { ascending: false }),
    fetchAdminSubscriptionAnalytics(),
    fetchActiveUsers30d(admin, since),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const org of orgs ?? []) {
    if (org.is_suspended) continue;
    statusCounts[org.subscription_status] =
      (statusCounts[org.subscription_status] ?? 0) + 1;
  }

  const revenue = computeRevenueMetrics(
    subscriptionAnalytics.orgs,
    subscriptionAnalytics.canceledLast30d,
    subscriptionAnalytics.convertedTrialsLast30d,
    subscriptionAnalytics.trialingStartLast30d,
  );

  const periodEndByOrg = buildPeriodEndByOrg(subscriptions ?? []);

  const recentOrganizations = (orgs ?? []).slice(0, 5).map((o) => ({
    id: o.id,
    name: o.name,
    subscriptionStatus: o.subscription_status,
    subscriptionPlan: o.subscription_plan,
    createdAt: o.created_at,
  }));

  const trialExpiringQueue = buildTrialExpiringQueue(
    orgs ?? [],
    periodEndByOrg,
    trialCutoff,
  );

  const failedPaymentQueue = buildFailedPaymentQueue(orgs ?? []);

  const suspendedOrganizations: AdminQueueItem[] = (orgs ?? [])
    .filter((o) => o.is_suspended)
    .slice(0, 8)
    .map((o) => ({
      id: o.id,
      label: o.name,
      href: adminRoutes.organizationDetail(o.id),
    }));

  const actorIds = [...new Set((auditEntries ?? []).map((e) => e.actor_user_id))];
  const { data: actorProfiles } =
    actorIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name")
          .in("id", actorIds)
      : { data: [] };
  const actorNameById = new Map(
    (actorProfiles ?? []).map((p) => [p.id, p.full_name] as const),
  );

  const recentAuditEntries = (auditEntries ?? []).map((e) => ({
    id: e.id,
    action: e.action,
    targetType: e.target_type,
    targetId: e.target_id,
    createdAt: e.created_at,
    actorName: actorNameById.get(e.actor_user_id) ?? null,
  }));

  const revenueTrend = buildMonthlyTrend(
    subscriptionAnalytics.orgs,
    "estimated",
  );
  const newTenantsTrend = buildDailyNewOrgsTrend(
    (orgs ?? []).map((o) => ({ createdAt: o.created_at })),
  );

  return {
    organizationCount: organizationCount ?? 0,
    userCount: userCount ?? 0,
    suspendedCount: suspendedCount ?? 0,
    newOrganizationsLast7Days: newOrganizationsLast7Days ?? 0,
    statusCounts,
    bookingsLast30Days: bookingsLast30Days ?? 0,
    inquiriesLast30Days: inquiriesLast30Days ?? 0,
    revenue,
    activeUsers30d,
    recentOrganizations,
    trialExpiringQueue,
    failedPaymentQueue,
    suspendedOrganizations,
    recentAuditEntries,
    revenueTrend,
    newTenantsTrend,
  };
}
