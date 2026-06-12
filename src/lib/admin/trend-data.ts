import type { TrendPoint } from "@/components/admin/admin-trend-chart";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminQueueItem } from "@/lib/admin/types";
import { SAAS_MONTHLY_PRICE_NOK, SAAS_TRIAL_DAYS } from "@/lib/billing/constants";
import {
  isCancelledBookingStatus,
  parseLocalDate,
} from "@/lib/dashboard-metrics";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export type OrgForTrend = {
  subscriptionStatus: string;
  isSuspended: boolean;
  createdAt: string;
};

export type OrgForQueue = {
  id: string;
  name: string;
  subscription_status: string;
  is_suspended: boolean;
  created_at: string;
  billing_email?: string | null;
};

export function resolveTrialPeriodEnd(
  orgId: string,
  createdAt: string,
  periodEndByOrg: Map<string, string | null>,
): string | null {
  const fromSubscription = periodEndByOrg.get(orgId);
  if (fromSubscription) return fromSubscription;

  const estimated = new Date(createdAt);
  estimated.setDate(estimated.getDate() + SAAS_TRIAL_DAYS);
  return estimated.toISOString();
}

export function buildMonthlyTrend(
  orgs: OrgForTrend[],
  currentMrr: number,
): TrendPoint[] {
  const months: TrendPoint[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i -= 1) {
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const label = monthEnd.toLocaleDateString("nb-NO", { month: "short" });

    const activeAtMonth = orgs.filter((org) => {
      if (org.isSuspended || org.subscriptionStatus !== "active") return false;
      return new Date(org.createdAt) <= monthEnd;
    }).length;

    const value =
      i === 0 ? currentMrr : activeAtMonth * SAAS_MONTHLY_PRICE_NOK;

    months.push({ label, value });
  }

  return months;
}

export function buildDailyNewOrgsTrend(
  orgs: { createdAt: string }[],
): TrendPoint[] {
  const days: TrendPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const count = orgs.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= day && created < next;
    }).length;
    days.push({
      label: day.toLocaleDateString("nb-NO", { weekday: "short" }),
      value: count,
    });
  }
  return days;
}

export function buildBookingRevenueTrend(
  bookings: {
    total_price: number | null;
    event_date: string;
    status: string;
  }[],
  months = 12,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const label = monthStart.toLocaleDateString("nb-NO", { month: "short" });

    const value = (bookings ?? []).reduce((sum, booking) => {
      if (isCancelledBookingStatus(booking.status)) return sum;
      const eventDate = parseLocalDate(booking.event_date);
      if (eventDate < monthStart || eventDate > monthEnd) return sum;
      return sum + Number(booking.total_price ?? 0);
    }, 0);

    points.push({ label, value });
  }

  return points;
}

export function buildTrialExpiringQueue(
  orgs: OrgForQueue[],
  periodEndByOrg: Map<string, string | null>,
  trialCutoffIso: string,
  limit = 8,
): AdminQueueItem[] {
  return orgs
    .filter((o) => {
      if (o.is_suspended || o.subscription_status !== "trialing") return false;
      const end = resolveTrialPeriodEnd(o.id, o.created_at, periodEndByOrg);
      return end != null && end <= trialCutoffIso;
    })
    .sort((a, b) => {
      const endA = resolveTrialPeriodEnd(a.id, a.created_at, periodEndByOrg);
      const endB = resolveTrialPeriodEnd(b.id, b.created_at, periodEndByOrg);
      if (!endA || !endB) return 0;
      return new Date(endA).getTime() - new Date(endB).getTime();
    })
    .slice(0, limit)
    .map((o) => {
      const end = resolveTrialPeriodEnd(o.id, o.created_at, periodEndByOrg);
      return {
        id: o.id,
        label: o.name,
        sublabel: end
          ? format(new Date(end), "d. MMM yyyy", { locale: nb })
          : undefined,
        href: adminRoutes.organizationDetail(o.id),
        meta: o.billing_email ?? undefined,
      };
    });
}

export function buildFailedPaymentQueue(
  orgs: OrgForQueue[],
  limit = 8,
): AdminQueueItem[] {
  return orgs
    .filter((o) => o.subscription_status === "past_due" && !o.is_suspended)
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      label: o.name,
      href: adminRoutes.organizationDetail(o.id),
      meta: o.billing_email ? `mailto:${o.billing_email}` : undefined,
    }));
}

export function buildPeriodEndByOrg(
  subscriptions: {
    organization_id: string;
    current_period_end: string | null;
  }[],
): Map<string, string | null> {
  const periodEndByOrg = new Map<string, string | null>();
  for (const sub of subscriptions) {
    if (!periodEndByOrg.has(sub.organization_id)) {
      periodEndByOrg.set(sub.organization_id, sub.current_period_end);
    }
  }
  return periodEndByOrg;
}
