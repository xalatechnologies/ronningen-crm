import type { HealthStatus } from "@/lib/admin/queries/system-health";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: "Sunn",
  info: "Inaktiv",
  warning: "Advarsel",
  critical: "Kritisk",
};

export function AdminHealthStatusBadge({
  status,
  className,
}: {
  status: HealthStatus;
  className?: string;
}) {
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
      {STATUS_LABELS[status]}
    </span>
  );
}

export function overallStatusLabel(status: HealthStatus): string {
  return STATUS_LABELS[status];
}
