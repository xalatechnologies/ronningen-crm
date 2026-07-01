"use client";

import {
  subscriptionPlanLabel,
  subscriptionStatusLabel,
} from "@/lib/admin/subscription-labels";
import {
  supportStatusLabel,
  type SupportTicketStatus,
} from "@/lib/admin/support-labels";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export function AdminStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const label = subscriptionStatusLabel(status, t);
  const tone =
    status === "active"
      ? "border-success/40 bg-success/10 text-success dark:!text-white"
      : status === "past_due"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : status === "trialing"
          ? "border-rn-accent-border/50 bg-rn-surface-gradient-from text-success dark:!text-white"
          : "border-rn-border-strong bg-muted/30 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold md:text-app-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AdminSupportStatusBadge({
  status,
  className,
}: {
  status: SupportTicketStatus | string;
  className?: string;
}) {
  const { t } = useTranslation();
  const key = status as SupportTicketStatus;
  const label =
    key === "open" || key === "waiting" || key === "resolved"
      ? supportStatusLabel(key, t)
      : status;
  const tone =
    status === "open"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      : status === "waiting"
        ? "border-rn-border-strong bg-muted/40 text-muted-foreground"
        : "border-rn-border-strong bg-muted/20 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold md:text-app-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AdminPlanBadge({
  plan,
  className,
}: {
  plan: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "admin-plan-badge inline-flex min-w-[6.75rem] items-center justify-center rounded-md border-2 border-rn-border-strong bg-card px-2.5 py-0.5 text-center text-app-xs font-semibold text-foreground md:text-app-sm",
        className,
      )}
    >
      {subscriptionPlanLabel(plan, t)}
    </span>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: ReactNode;
  href?: string;
}) {
  const { t } = useTranslation();
  const body = (
    <>
      <p className="dashboard-kpi-label">{label}</p>
      <p className="dashboard-kpi-value mt-2 text-foreground">{value}</p>
      {hint ? (
        <div className="dashboard-kpi-caption mt-2 text-muted-foreground">{hint}</div>
      ) : null}
    </>
  );

  const className = cn(
    RN_CARD_SHELL,
    "px-[length:var(--app-card-padding)] py-[length:calc(var(--app-card-padding)*0.85)] md:py-[length:var(--app-card-padding)]",
    href &&
      "group transition-colors hover:border-success/40 hover:bg-muted/20 focus-within:ring-2 focus-within:ring-success/30",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
        <span className="sr-only">
          {t("common.actions.view")} {label}
        </span>
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
