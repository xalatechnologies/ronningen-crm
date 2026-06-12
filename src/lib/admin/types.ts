export type HealthScoreTier = "healthy" | "warning" | "at_risk" | "critical";

export type HealthScoreResult = {
  score: number;
  tier: HealthScoreTier;
};

export type AdminQueueItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  meta?: string;
};

export type RevenueMetrics = {
  mrrNok: number;
  /** MRR if all non-suspended trialing orgs convert at list price. */
  potentialMrrNok: number;
  arrNok: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  churnRate30d: number;
  trialConversionRate30d: number;
};
