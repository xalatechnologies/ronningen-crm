"use client";

import { overallStatusLabel } from "@/components/admin/admin-health-status-badge";
import { adminSettingsHref } from "@/lib/admin/settings-links";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";
import type { AdminSettingsTabId } from "@/components/admin/settings/admin-settings-tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Activity,
  Plug,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const kpiTileClass =
  "flex h-full w-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 text-left shadow-sm transition-colors hover:border-success/35 hover:bg-rn-surface-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 sm:p-6";

function SettingsKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  active,
  href,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof Activity;
  iconClassName?: string;
  valueClassName?: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(kpiTileClass, active && "border-success/50 bg-rn-surface-gradient-from/40")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label">{label}</span>
        <div className={cn("rounded-md p-2", iconClassName ?? "bg-accent")}>
          <Icon className="size-6 text-primary" aria-hidden />
        </div>
      </div>
      <div>
        <p className={cn("dashboard-kpi-value", valueClassName ?? "text-success")}>
          {value}
        </p>
        <p className="dashboard-kpi-caption mt-3 text-muted-foreground">{caption}</p>
      </div>
      <span className="sr-only">Gå til {label}</span>
    </Link>
  );
}

function overallStatusValueClass(
  status: AdminSettingsOverview["summary"]["overallStatus"],
): string {
  if (status === "critical") return "text-destructive";
  if (status === "warning") return "text-amber-800 dark:text-amber-300";
  if (status === "info") return "text-muted-foreground";
  return "text-success";
}

export function AdminSettingsKpiStrip({
  settings,
  activeTab,
}: {
  settings: AdminSettingsOverview;
  activeTab: AdminSettingsTabId;
}) {
  const { summary, platformAdmins } = settings;

  const missingCaption =
    summary.missingRequiredCount === 0
      ? "Alle påkrevde variabler satt"
      : "Miljøvariabler som mangler";

  return (
    <section
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
      aria-label="Nøkkeltall"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <SettingsKpiTile
          label="Status"
          value={overallStatusLabel(summary.overallStatus)}
          caption={`${summary.configuredCount} av ${summary.totalCount} integrasjoner klare`}
          icon={Activity}
          iconClassName={
            summary.overallStatus === "critical"
              ? "bg-rn-danger-soft"
              : summary.overallStatus === "warning"
                ? "bg-amber-500/10"
                : undefined
          }
          valueClassName={overallStatusValueClass(summary.overallStatus)}
          active={activeTab === "integrations"}
          href={adminSettingsHref("integrations")}
        />
        <SettingsKpiTile
          label="Integrasjoner"
          value={`${summary.configuredCount}/${summary.totalCount}`}
          caption="Stripe, e-post, cron og database"
          icon={Plug}
          active={activeTab === "integrations"}
          href={adminSettingsHref("integrations")}
        />
        <SettingsKpiTile
          label="Administratorer"
          value={platformAdmins.length}
          caption={`Plattformadministrator${platformAdmins.length === 1 ? "" : "er"}`}
          icon={ShieldCheck}
          active={activeTab === "access"}
          href={adminSettingsHref("access")}
        />
        <SettingsKpiTile
          label="Mangler"
          value={summary.missingRequiredCount}
          caption={missingCaption}
          icon={AlertTriangle}
          iconClassName="bg-amber-500/10"
          valueClassName={
            summary.missingRequiredCount > 0
              ? "text-amber-800 dark:text-amber-300"
              : "text-success"
          }
          active={activeTab === "environment"}
          href={adminSettingsHref("environment")}
        />
      </div>
    </section>
  );
}
