"use client";

import { useTranslation } from "@/i18n/client";
import { HEALTH_SCORE_LABELS } from "@/lib/admin/health-score";
import {
  subscriptionPlanLabel,
  subscriptionStatusLabel,
  tenantAccessLabel,
} from "@/lib/admin/subscription-labels";
import type { HealthScoreResult } from "@/lib/admin/types";
import { resolveTenantAccess } from "@/lib/subscriptions/subscription-utils";
import { cn } from "@/lib/utils";

const HEALTH_DOT: Record<HealthScoreResult["tier"], string> = {
  healthy: "org-detail-badge-dot--healthy",
  warning: "org-detail-badge-dot--warning",
  at_risk: "org-detail-badge-dot--at_risk",
  critical: "org-detail-badge-dot--critical",
};

function subscriptionDotClass(status: string): string {
  if (status === "active") return "org-detail-badge-dot--active";
  if (status === "past_due") return "org-detail-badge-dot--critical";
  if (status === "trialing") return "org-detail-badge-dot--trialing";
  return "org-detail-badge-dot--neutral";
}

export function OrganizationDetailHealthBadge({
  health,
}: {
  health: HealthScoreResult;
}) {
  const { t } = useTranslation();
  return (
    <span className="org-detail-badge">
      <span
        className={cn("org-detail-badge-dot", HEALTH_DOT[health.tier])}
        aria-hidden
      />
      {HEALTH_SCORE_LABELS[health.tier]} ({health.score})
    </span>
  );
}

export function OrganizationDetailAccessBadge({
  isSuspended,
  subscriptionStatus,
  providerSubscriptionId = null,
  billingEnabled = false,
  billingExempt = false,
}: {
  isSuspended: boolean;
  subscriptionStatus: string;
  providerSubscriptionId?: string | null;
  billingEnabled?: boolean;
  billingExempt?: boolean;
}) {
  const { t } = useTranslation();
  const access = resolveTenantAccess(
    {
      is_suspended: isSuspended,
      subscription_status: subscriptionStatus,
      provider_subscription_id: providerSubscriptionId,
      billing_exempt: billingExempt,
    },
    { billingEnabled },
  );

  if (access === "suspended") {
    return (
      <span className="org-detail-badge">
        <span
          className="org-detail-badge-dot org-detail-badge-dot--critical"
          aria-hidden
        />
        {tenantAccessLabel("suspended", t)}
      </span>
    );
  }

  const statusLabel = subscriptionStatusLabel(subscriptionStatus, t);
  const accessLabel = tenantAccessLabel(access, t);
  const combined =
    accessLabel === statusLabel
      ? accessLabel
      : `${statusLabel} · ${accessLabel}`;

  return (
    <span className="org-detail-badge">
      <span
        className={cn(
          "org-detail-badge-dot",
          subscriptionDotClass(subscriptionStatus),
        )}
        aria-hidden
      />
      {combined}
    </span>
  );
}

export function OrganizationDetailPlanBadge({ plan }: { plan: string }) {
  const { t } = useTranslation();
  return (
    <span className="org-detail-badge">
      {subscriptionPlanLabel(plan, t)}
    </span>
  );
}
