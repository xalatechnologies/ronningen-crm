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
  id?: string;
  subscriptionStatus: string;
  isSuspended: boolean;
  createdAt: string;
};

export type SubscriptionStatusEvent = {
  organizationId: string;
  occurredAt: Date;
  status: string;
};

const INITIAL_ORG_SUBSCRIPTION_STATUS = "trialing";

export function parseSubscriptionStatusAuditRows(
  rows: {
    target_id: string | null;
    created_at: string;
    metadata: unknown;
  }[],
): SubscriptionStatusEvent[] {
  const events: SubscriptionStatusEvent[] = [];

  for (const row of rows) {
    if (!row.target_id) continue;
    const meta = row.metadata as Record<string, unknown> | null;
    const after = meta?.after as { subscription_status?: string } | undefined;
    if (!after?.subscription_status) continue;

    events.push({
      organizationId: row.target_id,
      occurredAt: new Date(row.created_at),
      status: after.subscription_status,
    });
  }

  return events.sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
}

export function indexSubscriptionStatusEvents(
  events: SubscriptionStatusEvent[],
): Map<string, SubscriptionStatusEvent[]> {
  const byOrg = new Map<string, SubscriptionStatusEvent[]>();

  for (const event of events) {
    const list = byOrg.get(event.organizationId) ?? [];
    list.push(event);
    byOrg.set(event.organizationId, list);
  }

  return byOrg;
}

export function resolveOrgSubscriptionStatusAt(
  org: OrgForTrend,
  at: Date,
  eventsByOrgId: Map<string, SubscriptionStatusEvent[]>,
): string | null {
  const created = new Date(org.createdAt);
  if (at < created) return null;

  const events = eventsByOrgId.get(org.id ?? "") ?? [];
  if (events.length === 0) {
    return org.subscriptionStatus;
  }

  let status = INITIAL_ORG_SUBSCRIPTION_STATUS;

  for (const event of events) {
    if (event.occurredAt > at) break;
    status = event.status;
  }

  return status;
}

export function mapOrganizationsForTrend(
  orgs: {
    id: string;
    subscription_status: string;
    is_suspended: boolean;
    created_at: string;
  }[],
): OrgForTrend[] {
  return orgs.map((org) => ({
    id: org.id,
    subscriptionStatus: org.subscription_status,
    isSuspended: org.is_suspended,
    createdAt: org.created_at,
  }));
}

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
  eventsByOrgId?: Map<string, SubscriptionStatusEvent[]>,
): number {
  return orgs.filter((org) => {
    if (org.isSuspended) return false;

    const statusAtMonth =
      eventsByOrgId != null
        ? resolveOrgSubscriptionStatusAt(org, monthEnd, eventsByOrgId)
        : org.subscriptionStatus;

    if (statusAtMonth == null) return false;
    if (!statusContributesToMrrTrend(statusAtMonth, mode)) return false;
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
  subscriptionAuditRows?: {
    target_id: string | null;
    created_at: string;
    metadata: unknown;
  }[],
): TrendPoint[] {
  const year = referenceDate.getFullYear();
  const months: TrendPoint[] = [];
  const eventsByOrgId =
    subscriptionAuditRows != null
      ? indexSubscriptionStatusEvents(
          parseSubscriptionStatusAuditRows(subscriptionAuditRows),
        )
      : undefined;

  for (let month = 0; month < 12; month += 1) {
    const monthEnd = monthEndForCalendarMonth(year, month, referenceDate);
    const label = formatTrendMonthLabel(new Date(year, month, 1));

    const orgCount =
      monthEnd == null
        ? 0
        : countOrgsForMrrTrendAt(orgs, monthEnd, mode, eventsByOrgId);
    const value = orgCount * SAAS_MONTHLY_PRICE_NOK;

    months.push({ label, value });
  }

  return months;
}

export function alignRevenueTrendCurrentMonth(
  points: TrendPoint[],
  referenceDate: Date,
  currentMrrNok: number,
): TrendPoint[] {
  const currentMonth = referenceDate.getMonth();
  return points.map((point, index) =>
    index === currentMonth ? { ...point, value: currentMrrNok } : point,
  );
}

export function buildDailyNewOrgsTrend(
  orgs: { createdAt: string }[],
  referenceDate: Date = new Date(),
): TrendPoint[] {
  const days: TrendPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(referenceDate);
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
