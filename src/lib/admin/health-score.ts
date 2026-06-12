import type { HealthScoreResult, HealthScoreTier } from "@/lib/admin/types";

export type HealthScoreInput = {
  subscriptionStatus: string;
  isSuspended: boolean;
  memberCount: number;
  bookingsLast30d: number;
  totalRevenue: number;
  unpaidRemaining: number;
  lastActivityAt: string | null;
};

function tierFromScore(score: number): HealthScoreTier {
  if (score >= 80) return "healthy";
  if (score >= 60) return "warning";
  if (score >= 40) return "at_risk";
  return "critical";
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  if (input.isSuspended) {
    return { score: 0, tier: "critical" };
  }

  let score = 50;

  if (["active", "trialing"].includes(input.subscriptionStatus)) {
    score += 15;
  } else if (input.subscriptionStatus === "past_due") {
    score -= 25;
  } else if (
    input.subscriptionStatus === "canceled" ||
    input.subscriptionStatus === "incomplete"
  ) {
    score -= 35;
  }

  if (input.bookingsLast30d > 0) score += 20;
  else if (input.bookingsLast30d === 0) score -= 10;

  if (input.totalRevenue > 0) score += 10;

  if (input.unpaidRemaining > 0) score -= Math.min(15, 5);

  if (input.memberCount > 1) score += 5;

  if (input.lastActivityAt) {
    const daysSince =
      (Date.now() - new Date(input.lastActivityAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSince <= 14) score += 15;
    else if (daysSince <= 30) score += 5;
    else score -= 10;
  } else {
    score -= 5;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, tier: tierFromScore(clamped) };
}

export const HEALTH_SCORE_LABELS: Record<HealthScoreTier, string> = {
  healthy: "Sunn",
  warning: "Advarsel",
  at_risk: "I risiko",
  critical: "Kritisk",
};
