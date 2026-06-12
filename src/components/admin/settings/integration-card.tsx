import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { AdminHealthStatusBadge } from "@/components/admin/admin-health-status-badge";
import type { PlatformIntegrationComponent } from "@/lib/admin/platform-integration-status";
import Link from "next/link";
import { cn } from "@/lib/utils";

function EnvVarPills({ vars }: { vars: string[] }) {
  if (vars.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {vars.map((name) => (
        <span
          key={name}
          className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-2 py-0.5 font-mono text-app-xs text-muted-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function IntegrationCard({
  integration,
}: {
  integration: PlatformIntegrationComponent;
}) {
  const needsAction =
    integration.status === "warning" || integration.status === "critical";

  return (
    <AdminDataPanel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {integration.href ? (
            <Link
              href={integration.href}
              className="font-heading text-base font-semibold text-success hover:underline sm:text-lg"
            >
              {integration.label}
            </Link>
          ) : (
            <h3 className="font-heading text-base font-semibold sm:text-lg">
              {integration.label}
            </h3>
          )}
          <p className="mt-1.5 text-app-sm text-muted-foreground">
            {integration.detail}
          </p>
        </div>
        <AdminHealthStatusBadge status={integration.status} />
      </div>

      {needsAction ? (
        <div
          className={cn(
            "mt-4 rounded-md border px-3 py-2.5",
            integration.status === "critical"
              ? "border-destructive/30 bg-destructive/5"
              : "border-amber-500/30 bg-amber-500/5",
          )}
        >
          <p className="text-app-sm text-foreground">{integration.runbook}</p>
        </div>
      ) : null}

      <div className={cn(needsAction ? "mt-4" : "mt-3")}>
        <EnvVarPills vars={integration.envVars} />
      </div>
    </AdminDataPanel>
  );
}
