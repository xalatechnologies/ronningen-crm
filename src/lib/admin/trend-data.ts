import type { TrendPoint } from "@/components/admin/admin-trend-chart";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminQueueItem } from "@/lib/admin/types";
import { SAAS_MONTHLY_PRICE_NOK, SAAS_TRIAL_DAYS } from "@/lib/billing/constants";
import {
  isCancelledBookingStatus,
  parseLocalDate,
} from "@/lib/dashboard-metrics";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";

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

export type MrrTrendMode = "realized" | "estimated";

function statusContributesToMrrTrend(
  status: string,
  mode: MrrTrendMode,
): boolean {
  if (mode === "realized") return status === "active";
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}

export function countOrgsForMrrTrendAt(
  orgs: OrgForTrend[],
  monthEnd: Date,
  mode: MrrTrendMode,
): number {
  return orgs.filter((org) => {
    if (org.isSuspended) return false;
    if (!statusContributesToMrrTrend(org.subscriptionStatus, mode)) return false;
    return new Date(org.createdAt) <= monthEnd;
  }).length;
}

function monthEndForCalendarMonth(
  year: number,
  month: number,
  referenceDate: Date,
): Date | null {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return null;
  }

  if (year === currentYear && month === currentMonth) {
    return referenceDate;
  }

  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function formatTrendMonthLabel(date: Date): string {
  return date
    .toLocaleDateString("nb-NO", { month: "short" })
    .replace(/\./g, "")
    .toUpperCase();
}

/** Calendar-year SaaS MRR trend (January–December). */
export function buildMonthlyTrend(
  orgs: OrgForTrend[],
  mode: MrrTrendMode = "estimated",
  referenceDate: Date = new Date(),
): TrendPoint[] {
  const year = referenceDate.getFullYear();
  const months: TrendPoint[] = [];

  for (let month = 0; month < 12; month += 1) {
    const monthEnd = monthEndForCalendarMonth(year, month, referenceDate);
    const label = formatTrendMonthLabel(new Date(year, month, 1));

    const orgCount =
      monthEnd == null
        ? 0
        : countOrgsForMrrTrendAt(orgs, monthEnd, mode);
    const value = orgCount * SAAS_MONTHLY_PRICE_NOK;

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
  referenceDate: Date = new Date(),
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const year = referenceDate.getFullYear();

  for (let month = 0; month < months; month += 1) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = monthEndForCalendarMonth(year, month, referenceDate);
    const label = formatTrendMonthLabel(monthStart);

    const value =
      monthEnd == null
        ? 0
        : (bookings ?? []).reduce((sum, booking) => {
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
