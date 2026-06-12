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
  const paying = orgs.filter(
    (o) =>
      !o.isSuspended &&
      (o.subscriptionStatus === "active" || o.subscriptionStatus === "trialing"),
  );
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

  const activeAtStart = orgs.filter((o) => {
    const created = new Date(o.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return (
      created < thirtyDaysAgo &&
      !o.isSuspended &&
      o.subscriptionStatus !== "canceled"
    );
  }).length;

  const churnRate30d =
    activeAtStart > 0 ? (canceledLast30d / activeAtStart) * 100 : 0;

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
    churnRate30d: Math.round(churnRate30d * 10) / 10,
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
