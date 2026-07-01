"use client";

import { useTranslation } from "@/i18n/client";
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
import type { Translator } from "@/i18n/types";
import type { AdminUserRow } from "@/lib/admin/queries/users-billing-audit";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
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

function userStatus(user: AdminUserRow, t: Translator): {
  label: string;
  className: string;
} {
  if (user.isDisabled) {
    return { label: t("admin.deaktivert"), className: "font-semibold text-destructive" };
  }
  if (isInactiveUser(user)) {
    return { label: t("admin.inaktiv"), className: "font-semibold text-muted-foreground" };
  }
  return { label: t("admin.aktiv"), className: "font-semibold text-success" };
}

function orgSubtitle(user: AdminUserRow, t: Translator): string | undefined {
  const primaryOrg = user.organizations[0];
  if (!primaryOrg) return t("admin.ingen_organisasjon");
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
  const { t, locale } = useTranslation();
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
            title={t("admin.brukere")}
            description={t("admin.oversikt_over_registrerte_brukere_plattformadministratorer_o")}
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <UsersKpiTile
              label={t("admin.totalt")}
              value={overview.total}
              caption={t("admin.users_with_organization", {
                count: overview.withOrganization,
              })}
              icon={Users}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <UsersKpiTile
              label={t("admin.plattformadmin")}
              value={overview.platformAdmins}
              caption={t("admin.super_administratorer")}
              icon={ShieldCheck}
              active={filter === "platform_admin"}
              onClick={() => updateFilter("platform_admin")}
            />
            <UsersKpiTile
              label={t("admin.uten_org")}
              value={noOrgCount}
              caption={
                noOrgCount === 0
                  ? t("admin.alle_brukere_tilhorer_en_org")
                  : t("admin.uten_organisasjonstilhorighet")
              }
              icon={UserRound}
              active={filter === "no_org"}
              onClick={() => updateFilter("no_org")}
            />
            <UsersKpiTile
              label={t("admin.inaktive")}
              value={overview.inactive}
              caption={t("admin.inactive_no_sign_in_90d")}
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
                <th className={tableHeadClass}>{t("adminLabels.fields.name")}</th>
                <th className={tableHeadClass}>{t("admin.e_post")}</th>
                <th className={tableHeadClass}>{t("admin.status")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.lastLogin")}</th>
                <th className={cn(tableHeadClass, "text-right")}>{t("admin.organisasjoner")}</th>
                <th className={tableHeadClass}>{t("admin.plattformadmin")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.registered")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((user) => {
                const status = userStatus(user, t);

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
                        subtitle={orgSubtitle(user, t)}
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
                            locale: getDateFnsLocale(locale),
                          })
                        : t("admin.aldri")}
                    </td>
                    <td className={cn(tableCellClass, "text-right tabular-nums")}>
                      {user.organizationCount}
                    </td>
                    <td className={tableCellClass}>
                      {user.isPlatformAdmin ? (
                        <span className="font-semibold text-success">{t("adminLabels.fields.yes")}</span>
                      ) : (
                        <span className="text-muted-foreground">{t("adminLabels.fields.no")}</span>
                      )}
                    </td>
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {format(new Date(user.createdAt), "d. MMM yyyy", {
                        locale: getDateFnsLocale(locale),
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
                          ? t("admin.ingen_brukere_enna")
                          : t("admin.ingen_treff_i_listen")}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {users.length === 0
                          ? t("admin.registrerte_brukere_vises_her")
                          : t("admin.juster_soket_eller_bytt_filter_nullstill_ved_a_velge_alle_og")}
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
            {t("admin.viser_av_brukere", {
              shown: filtered.length,
              total: users.length,
            })}
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          {t("admin.inaktive_brukere_hint")}
        </p>
      </div>
    </div>
  );
}
