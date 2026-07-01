"use client";

import { overallStatusLabel } from "@/components/admin/admin-health-status-badge";
import { adminSettingsHref } from "@/lib/admin/settings-links";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";
import type { AdminSettingsTabId } from "@/components/admin/settings/admin-settings-tabs";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Plug,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const kpiInteractiveClass =
  "group w-full text-left transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30";

const kpiActiveClass = "border-success/40 bg-muted/20 ring-2 ring-success/25";

function overallStatusValueClass(
  status: AdminSettingsOverview["summary"]["overallStatus"],
): string {
  if (status === "critical") return "text-destructive";
  if (status === "warning") return "text-amber-800 dark:text-amber-300";
  if (status === "info") return "text-muted-foreground";
  return "text-success";
}

function SettingsKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  active,
  href,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  active?: boolean;
  href: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(kpiTileClass, kpiInteractiveClass, active && kpiActiveClass)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label min-w-0 break-words">{label}</span>
        <div className={cn(iconContainerClassName, "shrink-0")}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("dashboard-kpi-value break-words", valueClassName)}>{value}</p>
        <p className="dashboard-kpi-caption mt-2 text-muted-foreground sm:mt-3">
          {caption}
        </p>
      </div>
      <span className="sr-only">Gå til {label}</span>
    </Link>
  );
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

  const statusIconContainer =
    summary.overallStatus === "critical"
      ? "rounded-md bg-rn-danger-soft p-2"
      : summary.overallStatus === "warning"
        ? "rounded-md bg-amber-500/10 p-2"
        : undefined;

  const statusIconClass =
    summary.overallStatus === "critical"
      ? "size-6 text-rn-danger-ink"
      : summary.overallStatus === "warning"
        ? "size-6 text-amber-800 dark:text-amber-300"
        : undefined;

  return (
    <section
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
      aria-label="Nøkkeltall"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <SettingsKpiTile
          label="Status"
          value={overallStatusLabel(summary.overallStatus)}
          caption={`${summary.configuredCount} av ${summary.totalCount} integrasjoner klare`}
          icon={Activity}
          iconContainerClassName={statusIconContainer}
          iconClassName={statusIconClass}
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
          iconContainerClassName="rounded-md bg-amber-500/10 p-2"
          iconClassName="size-6 text-amber-800 dark:text-amber-300"
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
