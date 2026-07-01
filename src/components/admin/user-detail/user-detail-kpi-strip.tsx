"use client";

import type { UserDetailTabId } from "@/components/admin/user-detail/tabs";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { cn } from "@/lib/utils";
import {
  Building2,
  ClipboardList,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

function UserDetailKpiTile({
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

export function UserDetailKpiStrip({
  user,
  tab,
  onTabChange,
}: {
  user: AdminUserDetail;
  tab: UserDetailTabId;
  onTabChange: (tab: UserDetailTabId) => void;
}) {
  const orgCaption =
    user.organizations.length === 1
      ? "1 organisasjonstilhørighet"
      : `${user.organizations.length} organisasjonstilhørigheter`;

  return (
    <section
      className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
      aria-label="Nøkkeltall"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        <UserDetailKpiTile
          label="Organisasjoner"
          value={user.organizations.length}
          caption={orgCaption}
          icon={Building2}
          active={tab === "organizations"}
          onClick={() => onTabChange("organizations")}
        />
        <UserDetailKpiTile
          label="Kontostatus"
          value={user.isDisabled ? "Deaktivert" : "Aktiv"}
          caption={user.isDisabled ? "Kan ikke logge inn" : "Konto er aktiv"}
          icon={UserRound}
          iconContainerClassName={
            user.isDisabled
              ? "rounded-md bg-rn-danger-soft p-2"
              : undefined
          }
          iconClassName={
            user.isDisabled
              ? "size-6 text-rn-danger-ink"
              : undefined
          }
          valueClassName={user.isDisabled ? "text-destructive" : "text-success"}
        />
        <UserDetailKpiTile
          label="Plattformadmin"
          value={user.isPlatformAdmin ? "Ja" : "Nei"}
          caption={
            user.isPlatformAdmin
              ? "Super-administrator"
              : "Vanlig brukerkonto"
          }
          icon={ShieldCheck}
          valueClassName={user.isPlatformAdmin ? "text-success" : "text-foreground"}
        />
        <UserDetailKpiTile
          label="Revisjonsposter"
          value={user.auditEntries.length}
          caption="Handlinger knyttet til brukeren"
          icon={ClipboardList}
          active={tab === "audit"}
          onClick={() => onTabChange("audit")}
        />
      </div>
    </section>
  );
}
