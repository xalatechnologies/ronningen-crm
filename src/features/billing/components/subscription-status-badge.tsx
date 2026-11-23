"use client";

import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { statusLabel } from "@/lib/navigation/nav-labels";

const TONE_BY_STATUS: Record<string, StatusTone> = {
  active: "success",
  trialing: "info",
  past_due: "danger",
  incomplete: "warning",
};

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return <StatusBadge tone={TONE_BY_STATUS[status] ?? "neutral"}>{statusLabel(status, t)}</StatusBadge>;
}
