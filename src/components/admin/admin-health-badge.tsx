import { HEALTH_SCORE_LABELS } from "@/lib/admin/health-score";
import type { HealthScoreResult } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

export function AdminHealthBadge({ health }: { health: HealthScoreResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-app-xs font-semibold",
        health.tier === "healthy" && "admin-health-healthy bg-emerald-500/10",
        health.tier === "warning" && "admin-health-warning bg-amber-500/10",
        health.tier === "at_risk" && "admin-health-at_risk bg-orange-500/10",
        health.tier === "critical" && "admin-health-critical bg-destructive/10",
      )}
    >
      {HEALTH_SCORE_LABELS[health.tier]} ({health.score})
    </span>
  );
}
