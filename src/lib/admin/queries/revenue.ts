import type { TrendPoint } from "@/components/admin/admin-trend-chart";
import { computeRevenueMetrics } from "@/lib/admin/revenue-metrics";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { AdminQueueItem, RevenueMetrics } from "@/lib/admin/types";
import {
  buildBookingRevenueTrend,
  buildFailedPaymentQueue,
  buildMonthlyTrend,
  buildPeriodEndByOrg,
  buildTrialExpiringQueue,
} from "@/lib/admin/trend-data";
import type { AdminSubscriptionAnalytics } from "@/lib/admin/queries/users-billing-audit";
import { fetchAdminSubscriptionAnalytics } from "@/lib/admin/queries/users-billing-audit";
import {
  isCancelledBookingStatus,
  parseLocalDate,
} from "@/lib/dashboard-metrics";

export type AdminRevenueActivePayer = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  memberCount: number;
};

export type AdminRevenueOverview = AdminSubscriptionAnalytics & {
  metrics: RevenueMetrics;
  outstandingNok: number;
  revenueThisMonthNok: number;
  revenueLastMonthNok: number;
  statusCounts: Record<string, number>;
  planCounts: Record<string, number>;
  revenueTrend: TrendPoint[];
  bookingRevenueTrend: TrendPoint[];
  failedPaymentQueue: AdminQueueItem[];
  trialExpiringQueue: AdminQueueItem[];
  activePayers: AdminRevenueActivePayer[];
};

export async function fetchAdminRevenueOverview(): Promise<AdminRevenueOverview> {
  const admin = createSupabaseAdminClient();
  const analytics = await fetchAdminSubscriptionAnalytics();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const trialCutoff = fourteenDaysFromNow.toISOString();

  const [
    { data: bookings },
    { data: orgs },
    { data: memberCounts },
    { data: subscriptions },
  ] = await Promise.all([
    admin.from("bookings").select("total_price, event_date, remaining_amount, status"),
    admin
      .from("organizations")
      .select(
        "id, name, slug, subscription_status, subscription_plan, is_suspended, created_at, billing_email",
      )
      .order("name", { ascending: true }),
    admin.from("organization_members").select("organization_id"),
    admin
      .from("subscriptions")
      .select("organization_id, current_period_end, status")
      .order("created_at", { ascending: false }),
  ]);

  let outstandingNok = 0;
  let revenueThisMonthNok = 0;
  let revenueLastMonthNok = 0;

  for (const b of bookings ?? []) {
    if (isCancelledBookingStatus(b.status)) continue;

    outstandingNok += Number(b.remaining_amount ?? 0);
    const eventDate = parseLocalDate(b.event_date);
    const price = Number(b.total_price ?? 0);
    if (eventDate >= thisMonthStart) revenueThisMonthNok += price;
    if (eventDate >= lastMonthStart && eventDate <= lastMonthEnd) {
      revenueLastMonthNok += price;
    }
  }

  const countByOrg = new Map<string, number>();
  for (const row of memberCounts ?? []) {
    countByOrg.set(
      row.organization_id,
      (countByOrg.get(row.organization_id) ?? 0) + 1,
    );
  }

  const statusCounts: Record<string, number> = {};
  const planCounts: Record<string, number> = {};
  const activePayers: AdminRevenueActivePayer[] = [];

  for (const o of orgs ?? []) {
    if (!o.is_suspended) {
      statusCounts[o.subscription_status] =
        (statusCounts[o.subscription_status] ?? 0) + 1;
    }
    planCounts[o.subscription_plan] =
      (planCounts[o.subscription_plan] ?? 0) + 1;

    if (!o.is_suspended && o.subscription_status === "active") {
      activePayers.push({
        id: o.id,
        name: o.name,
        slug: o.slug,
        plan: o.subscription_plan,
        status: o.subscription_status,
        memberCount: countByOrg.get(o.id) ?? 0,
      });
    }
  }

  const metrics = computeRevenueMetrics(
    analytics.orgs,
    analytics.canceledLast30d,
    analytics.convertedTrialsLast30d,
    analytics.trialingStartLast30d,
  );

  const periodEndByOrg = buildPeriodEndByOrg(subscriptions ?? []);
  const revenueTrend = buildMonthlyTrend(analytics.orgs, "realized");
  const bookingRevenueTrend = buildBookingRevenueTrend(bookings ?? []);
  const trialExpiringQueue = buildTrialExpiringQueue(
    orgs ?? [],
    periodEndByOrg,
    trialCutoff,
  );
  const failedPaymentQueue = buildFailedPaymentQueue(orgs ?? []);

  return {
    ...analytics,
    metrics,
    outstandingNok,
    revenueThisMonthNok,
    revenueLastMonthNok,
    statusCounts,
    planCounts,
    revenueTrend,
    bookingRevenueTrend,
    failedPaymentQueue,
    trialExpiringQueue,
    activePayers,
  };
}

export function formatMonthOverMonth(
  current: number,
  previous: number,
): string {
  if (previous === 0) {
    return current > 0 ? "Ny" : "—";
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
