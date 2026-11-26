import { SAAS_MONTHLY_PRICE_NOK } from "@/lib/billing/constants";
import type { RevenueMetrics } from "@/lib/admin/types";

type OrgForRevenue = {
  subscriptionStatus: string;
  isSuspended: boolean;
  createdAt: string;
};

export function computeRevenueMetrics(
  orgs: OrgForRevenue[],
  canceledLast30d: number,
  convertedTrialsLast30d: number,
  trialingStartLast30d: number,
): RevenueMetrics {
  const activeOnly = orgs.filter(
    (o) => !o.isSuspended && o.subscriptionStatus === "active",
  );
  const trialing = orgs.filter(
    (o) => !o.isSuspended && o.subscriptionStatus === "trialing",
  );
  const pastDue = orgs.filter(
    (o) => !o.isSuspended && o.subscriptionStatus === "past_due",
  );

  const mrrNok = activeOnly.length * SAAS_MONTHLY_PRICE_NOK;
  const potentialMrrNok =
    (activeOnly.length + trialing.length) * SAAS_MONTHLY_PRICE_NOK;

  // Churn is measured against customers that were paying 30 days ago: still-paying orgs older than 30 days,
  // plus the ones that cancelled in the window. Trials never count as a base.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const stillPayingFromStart = orgs.filter(
    (o) =>
      !o.isSuspended &&
      (o.subscriptionStatus === "active" || o.subscriptionStatus === "past_due") &&
      new Date(o.createdAt) < thirtyDaysAgo,
  ).length;
  const payingAtStart = stillPayingFromStart + canceledLast30d;

  const churnRate30d =
    payingAtStart > 0 ? Math.round((canceledLast30d / payingAtStart) * 1000) / 10 : null;

  const trialConversionRate30d =
    trialingStartLast30d > 0
      ? (convertedTrialsLast30d / trialingStartLast30d) * 100
      : 0;

  return {
    mrrNok,
    potentialMrrNok,
    arrNok: mrrNok * 12,
    activeSubscriptions: activeOnly.length,
    trialingSubscriptions: trialing.length,
    pastDueSubscriptions: pastDue.length,
    churnRate30d,
    trialConversionRate30d: Math.round(trialConversionRate30d * 10) / 10,
  };
}

export function formatNok(amount: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amount);
}
