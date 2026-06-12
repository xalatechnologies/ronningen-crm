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
import { nb } from "date-fns/locale";
import {
  ShieldCheck,
  UserRound,
  UserRoundX,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export type { AdminUserFilter } from "@/components/admin/admin-user-filters";

const tableHeadClass =
  "px-6 py-4 text-left text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

const kpiTileClass =
  "flex w-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 text-left shadow-sm transition-colors hover:border-success/35 hover:bg-rn-surface-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 sm:p-6";

function UserKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof Users;
  iconClassName?: string;
  valueClassName?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        kpiTileClass,
        active && "border-success/50 bg-rn-surface-gradient-from/40",
      )}
      aria-pressed={active ? "true" : "false"}
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
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <UserKpiTile
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
            <UserKpiTile
              label="Plattformadmin"
              value={overview.platformAdmins}
              caption="Super-administratorer"
              icon={ShieldCheck}
              active={filter === "platform_admin"}
              onClick={() => updateFilter("platform_admin")}
            />
            <UserKpiTile
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
            <UserKpiTile
              label="Inaktive"
              value={overview.inactive}
              caption="90+ dager uten innlogging"
              icon={UserRoundX}
              iconClassName="bg-muted/60"
              valueClassName={
                overview.inactive > 0
                  ? "text-muted-foreground"
                  : "text-success"
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

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">
            Viser {filtered.length} av {users.length} brukere
          </p>
        </div>

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          <table className="w-full min-w-[960px] text-left text-app-base">
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
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {user.email ?? "—"}
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

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Inaktive brukere har ikke logget inn på over 90 dager, eller har aldri
          logget inn. Deaktiverte kontoer kan gjenåpnes fra brukerdetaljer.
        </p>
      </div>
    </div>
  );
}
