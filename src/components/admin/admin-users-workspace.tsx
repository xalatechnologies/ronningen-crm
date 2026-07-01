"use client";

import {
  AdminUserFilterBar,
  computeAdminUserFilterCounts,
  computeAdminUserOverviewStats,
  isInactiveUser,
  matchesAdminUserFilter,
  type AdminUserFilter,
} from "@/components/admin/admin-user-filters";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import type { AdminUserRow } from "@/lib/admin/queries/users-billing-audit";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import {
  ShieldCheck,
  UserRound,
  UserRoundX,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export type { AdminUserFilter } from "@/components/admin/admin-user-filters";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "px-4 py-3 text-left text-app-sm font-semibold tracking-wider text-rn-text-column uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 align-middle sm:px-6 sm:py-5 md:px-8 md:py-6";

function UsersKpiTile({
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
  onClick: () => void;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
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
    </button>
  );
}

function userStatus(user: AdminUserRow): {
  label: string;
  className: string;
} {
  if (user.isDisabled) {
    return { label: "Deaktivert", className: "font-semibold text-destructive" };
  }
  if (isInactiveUser(user)) {
    return { label: "Inaktiv", className: "font-semibold text-muted-foreground" };
  }
  return { label: "Aktiv", className: "font-semibold text-success" };
}

function orgSubtitle(user: AdminUserRow): string | undefined {
  const primaryOrg = user.organizations[0];
  if (!primaryOrg) return "Ingen organisasjon";
  if (user.organizationCount > 1) {
    return `${primaryOrg.name} +${user.organizationCount - 1}`;
  }
  return primaryOrg.name;
}

type AdminUsersWorkspaceProps = {
  users: AdminUserRow[];
  initialFilter?: AdminUserFilter;
  initialSearch?: string;
};

export function AdminUsersWorkspace({
  users,
  initialFilter = "all",
  initialSearch = "",
}: AdminUsersWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AdminUserFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);

  const counts = useMemo(() => computeAdminUserFilterCounts(users), [users]);

  const overview = useMemo(
    () => computeAdminUserOverviewStats(users),
    [users],
  );

  const filtered = useMemo(
    () => users.filter((user) => matchesAdminUserFilter(user, filter, search)),
    [filter, search, users],
  );

  function updateUrl(next: { filter?: AdminUserFilter; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = next.filter ?? filter;
    const nextSearch = next.q ?? search;

    if (nextFilter === "all") params.delete("filter");
    else params.set("filter", nextFilter);

    if (!nextSearch.trim()) params.delete("q");
    else params.set("q", nextSearch.trim());

    const query = params.toString();
    router.push(query ? `${adminRoutes.users}?${query}` : adminRoutes.users);
  }

  function updateFilter(nextFilter: AdminUserFilter) {
    setFilter(nextFilter);
    updateUrl({ filter: nextFilter });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    updateUrl({ q: nextSearch });
  }

  const noOrgCount = overview.total - overview.withOrganization;

  return (
    <div className="admin-page-workspace admin-users-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Brukere"
            description="Oversikt over registrerte brukere, plattformadministratorer og organisasjonstilhørighet."
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <UsersKpiTile
              label="Totalt"
              value={overview.total}
              caption={`${overview.withOrganization} med organisasjon`}
              icon={Users}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <UsersKpiTile
              label="Plattformadmin"
              value={overview.platformAdmins}
              caption="Super-administratorer"
              icon={ShieldCheck}
              active={filter === "platform_admin"}
              onClick={() => updateFilter("platform_admin")}
            />
            <UsersKpiTile
              label="Uten org"
              value={noOrgCount}
              caption={
                noOrgCount === 0
                  ? "Alle brukere tilhører en org"
                  : "Uten organisasjonstilhørighet"
              }
              icon={UserRound}
              active={filter === "no_org"}
              onClick={() => updateFilter("no_org")}
            />
            <UsersKpiTile
              label="Inaktive"
              value={overview.inactive}
              caption="90+ dager uten innlogging"
              icon={UserRoundX}
              iconContainerClassName="rounded-md bg-muted/60 p-2"
              iconClassName="size-6 text-muted-foreground"
              valueClassName={
                overview.inactive > 0 ? "text-muted-foreground" : "text-success"
              }
              active={filter === "inactive"}
              onClick={() => updateFilter("inactive")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminUserFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            filter={filter}
            onFilterChange={updateFilter}
            counts={counts}
          />
        </section>

        <div className="app-table -mx-px max-w-full overflow-x-auto border-t border-rn-border-strong/50 overscroll-x-contain">
          <table className="w-full min-w-[52rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={tableHeadClass}>Navn</th>
                <th className={tableHeadClass}>E-post</th>
                <th className={tableHeadClass}>Status</th>
                <th className={tableHeadClass}>Sist innlogget</th>
                <th className={cn(tableHeadClass, "text-right")}>Organisasjoner</th>
                <th className={tableHeadClass}>Plattformadmin</th>
                <th className={tableHeadClass}>Registrert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((user) => {
                const status = userStatus(user);

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors hover:bg-rn-surface-row-hover",
                      user.isDisabled && "bg-destructive/5",
                    )}
                  >
                    <td className="p-0 align-middle">
                      <AdminTableDetailLink
                        href={adminRoutes.userDetail(user.id)}
                        title={user.fullName ?? "—"}
                        subtitle={orgSubtitle(user)}
                      />
                    </td>
                    <td className={cn(tableCellClass, "max-w-[11rem] truncate text-muted-foreground sm:max-w-xs md:max-w-md")}>
                      <span className="block truncate" title={user.email ?? undefined}>
                        {user.email ?? "—"}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <span className={status.className}>{status.label}</span>
                    </td>
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {user.lastSignInAt
                        ? format(new Date(user.lastSignInAt), "d. MMM yyyy", {
                            locale: nb,
                          })
                        : "Aldri"}
                    </td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>
                      {user.organizationCount}
                    </td>
                    <td className={tableCellClass}>
                      {user.isPlatformAdmin ? (
                        <span className="font-semibold text-success">Ja</span>
                      ) : (
                        <span className="text-muted-foreground">Nei</span>
                      )}
                    </td>
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {format(new Date(user.createdAt), "d. MMM yyyy", {
                        locale: nb,
                      })}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        {users.length === 0
                          ? "Ingen brukere ennå"
                          : "Ingen treff i listen"}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {users.length === 0
                          ? "Registrerte brukere vises her."
                          : "Juster søket eller bytt filter. Nullstill ved å velge «Alle» og tømme søkefeltet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">
            Viser {filtered.length} av {users.length} brukere
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Inaktive brukere har ikke logget inn på over 90 dager, eller har aldri
          logget inn. Deaktiverte kontoer kan gjenåpnes fra brukerdetaljer.
        </p>
      </div>
    </div>
  );
}
