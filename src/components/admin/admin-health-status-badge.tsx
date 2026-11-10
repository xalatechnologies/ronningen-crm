"use client";

import { useTranslation } from "@/i18n/client";
import type { HealthStatus } from "@/lib/admin/queries/system-health";
import type { Translator } from "@/i18n/types";
import { cn } from "@/lib/utils";

const STATUS_KEYS = {
  healthy: "admin.sunn",
  info: "admin.inaktiv",
  warning: "admin.advarsel",
  critical: "admin.kritisk",
} as const;

export function overallStatusLabel(status: HealthStatus, t: Translator): string {
  return t(STATUS_KEYS[status]);
}

export function AdminHealthStatusBadge({
  status,
  className,
}: {
  status: HealthStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-1 text-app-xs font-semibold",
        status === "healthy" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "info" && "bg-muted/50 text-muted-foreground",
        status === "warning" && "bg-amber-500/10 text-amber-800 dark:text-amber-300",
        status === "critical" && "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {t(STATUS_KEYS[status])}
    </span>
  );
}
