"use client";

import { AdminKpiTile } from "@/components/admin/admin-kpi-tile";
import { overallStatusLabel } from "@/components/admin/admin-health-status-badge";
import { adminSettingsHref } from "@/lib/admin/settings-links";
import type { AdminSettingsOverview } from "@/lib/admin/queries/settings";
import type { AdminSettingsTabId } from "@/components/admin/settings/admin-settings-tabs";
import {
  AlertTriangle,
  Activity,
  Plug,
  ShieldCheck,
} from "lucide-react";

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
        <AdminKpiTile
          variant="settings"
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
        <AdminKpiTile
          variant="settings"
          label="Integrasjoner"
          value={`${summary.configuredCount}/${summary.totalCount}`}
          caption="Stripe, e-post, cron og database"
          icon={Plug}
          active={activeTab === "integrations"}
          href={adminSettingsHref("integrations")}
        />
        <AdminKpiTile
          variant="settings"
          label="Administratorer"
          value={platformAdmins.length}
          caption={`Plattformadministrator${platformAdmins.length === 1 ? "" : "er"}`}
          icon={ShieldCheck}
          active={activeTab === "access"}
          href={adminSettingsHref("access")}
        />
        <AdminKpiTile
          variant="settings"
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
