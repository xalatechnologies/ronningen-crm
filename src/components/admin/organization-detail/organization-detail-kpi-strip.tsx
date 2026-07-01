"use client";

import type { OrganizationDetailTabId } from "@/components/admin/organization-detail/tabs";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

function OrganizationDetailKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  active,
  onClick,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          kpiTileClass,
          "group w-full text-left transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
          active && "border-success/40 bg-muted/20 ring-2 ring-success/25",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={kpiTileClass}>{content}</div>;
}

export function OrganizationDetailKpiStrip({
  org,
  tab,
  onTabChange,
}: {
  org: AdminOrganizationDetail;
  tab: OrganizationDetailTabId;
  onTabChange: (tab: OrganizationDetailTabId) => void;
}) {
  const memberCaption =
    org.members.length === 1 ? "1 medlem i organisasjonen" : "Medlemmer i organisasjonen";

  return (
    <section
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
      aria-label="Nøkkeltall"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <OrganizationDetailKpiTile
          label="Medlemmer"
          value={org.members.length}
          caption={memberCaption}
          icon={Users}
          active={tab === "members"}
          onClick={() => onTabChange("members")}
        />
        <OrganizationDetailKpiTile
          label="Omsetning"
          value={formatNok(org.totalRevenue)}
          caption="Total bookinginntekt"
          icon={TrendingUp}
          active={tab === "usage"}
          onClick={() => onTabChange("usage")}
        />
        <OrganizationDetailKpiTile
          label="Utestående"
          value={formatNok(org.unpaidRemaining)}
          caption={
            org.unpaidRemaining > 0
              ? "Gjenstående beløp i bookinger"
              : "Ingen utestående beløp"
          }
          icon={Clock}
          iconContainerClassName={
            org.unpaidRemaining > 0
              ? "rounded-md bg-amber-500/10 p-2"
              : undefined
          }
          iconClassName={
            org.unpaidRemaining > 0
              ? "size-6 text-amber-800 dark:text-amber-300"
              : undefined
          }
          valueClassName={
            org.unpaidRemaining > 0
              ? "text-amber-800 dark:text-amber-300"
              : "text-success"
          }
          active={tab === "billing"}
          onClick={() => onTabChange("billing")}
        />
        <OrganizationDetailKpiTile
          label="Reservasjoner (30d)"
          value={org.bookingsLast30d}
          caption="Bookinger siste 30 dager"
          icon={CalendarCheck}
          active={tab === "usage"}
          onClick={() => onTabChange("usage")}
        />
      </div>
    </section>
  );
}
