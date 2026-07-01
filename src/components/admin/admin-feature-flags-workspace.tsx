"use client";

import { useTranslation } from "@/i18n/client";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import {
  AdminFeatureFlagFilterBar,
  type AdminFeatureFlagFilter,
} from "@/components/admin/admin-feature-flag-filters";
import { FeatureFlagDetailPanel } from "@/components/admin/feature-flag-detail-panel";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import { toggleFeatureFlag } from "@/lib/admin/actions/feature-flags";
import {
  adminAuditHref,
} from "@/lib/admin/dashboard-links";
import {
  computeFeatureFlagFilterCounts,
  featureFlagStatusLabel,
  matchesFeatureFlagFilter,
  resolveFeatureFlagStatus,
  type FeatureFlagStatus,
} from "@/lib/admin/feature-flag-status";
import type {
  AdminFeatureFlag,
  AdminFeatureFlagOverviewStats,
} from "@/lib/admin/queries/feature-flags";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import {
  ChevronDown,
  ChevronRight,
  Flag,
  Layers,
  Percent,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "px-4 py-3 text-left text-app-sm font-semibold tracking-wider text-rn-text-column uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 align-middle sm:px-6 sm:py-5 md:px-8 md:py-6";

function FeatureFlagsKpiTile({
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

function statusBadgeClass(status: FeatureFlagStatus): string {
  switch (status) {
    case "active":
      return "border-success/40 bg-success/10 text-success";
    case "rollout":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "scheduled":
      return "border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    default:
      return "border-rn-border-strong bg-muted/30 text-muted-foreground";
  }
}

function FeatureFlagStatusBadge({ flag }: { flag: AdminFeatureFlag }) {
  const { t } = useTranslation();
  const status = resolveFeatureFlagStatus(flag);
  return (
    <span
      className={cn(
        "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold md:text-app-sm",
        statusBadgeClass(status),
      )}
    >
      {featureFlagStatusLabel(status, t)}
    </span>
  );
}

type AdminFeatureFlagsWorkspaceProps = {
  flags: AdminFeatureFlag[];
  orgNames: Record<string, string>;
  stats: AdminFeatureFlagOverviewStats;
  billingEnvEnabled: boolean;
  initialFilter?: AdminFeatureFlagFilter;
  initialSearch?: string;
};

export function AdminFeatureFlagsWorkspace({
  flags,
  orgNames,
  stats,
  billingEnvEnabled,
  initialFilter = "all",
  initialSearch = "",
}: AdminFeatureFlagsWorkspaceProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AdminFeatureFlagFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{
    key: string;
    enabled: boolean;
  } | null>(null);

  const counts = useMemo(
    () => computeFeatureFlagFilterCounts(flags),
    [flags],
  );

  const filtered = useMemo(
    () => flags.filter((flag) => matchesFeatureFlagFilter(flag, filter, search)),
    [filter, flags, search],
  );

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(
      query ? `${adminRoutes.featureFlags}?${query}` : adminRoutes.featureFlags,
    );
  }

  function updateFilter(nextFilter: AdminFeatureFlagFilter) {
    setFilter(nextFilter);
    pushParams((params) => {
      if (nextFilter === "all") params.delete("filter");
      else params.set("filter", nextFilter);
    });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    pushParams((params) => {
      if (!nextSearch.trim()) params.delete("q");
      else params.set("q", nextSearch.trim());
    });
  }

  async function handleConfirmGlobalToggle() {
    if (!confirmToggle) return;

    setBusyKey(confirmToggle.key);
    const result = await toggleFeatureFlag({
      key: confirmToggle.key,
      enabledGlobal: confirmToggle.enabled,
    });
    setBusyKey(null);
    setConfirmToggle(null);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_oppdatere_flagg"), { description: result.error });
      return;
    }

    toast.success(t("admin.funksjonsflagg_oppdatert"));
    router.refresh();
  }

  const confirmFlag = confirmToggle
    ? flags.find((flag) => flag.key === confirmToggle.key)
    : null;

  return (
    <div className="admin-page-workspace admin-feature-flags-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.funksjonsflagg")}
            description={t("admin.kontrollert_utrulling_av_plattformfunksjoner")}
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <FeatureFlagsKpiTile
              label={t("admin.totalt")}
              value={stats.total}
              caption={t("admin.registrerte_funksjonsflagg")}
              icon={Flag}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <FeatureFlagsKpiTile
              label={t("admin.aktive_globalt")}
              value={stats.activeGlobal}
              caption={t("admin.slatt_pa_for_alle_organisasjoner")}
              icon={Settings2}
              active={filter === "active"}
              onClick={() => updateFilter("active")}
            />
            <FeatureFlagsKpiTile
              label={t("admin.gradvis_utrulling")}
              value={stats.partialRollout}
              caption={t("admin.delvis_aktivert_via_prosent")}
              icon={Percent}
              iconContainerClassName="rounded-md bg-amber-500/10 p-2"
              iconClassName="size-6 text-amber-800 dark:text-amber-300"
              valueClassName={
                stats.partialRollout > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
              active={filter === "rollout"}
              onClick={() => updateFilter("rollout")}
            />
            <FeatureFlagsKpiTile
              label={t("admin.org_unntak")}
              value={stats.overrideTotal}
              caption={t("admin.organisasjonsspesifikke_overstyringer")}
              icon={Layers}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminFeatureFlagFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            filter={filter}
            onFilterChange={updateFilter}
            counts={counts}
          />
        </section>

        <div className="app-table -mx-px max-w-full overflow-x-auto border-t border-rn-border-strong/50 overscroll-x-contain">
          <table className="w-full min-w-[48rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-10")} />
                <th className={tableHeadClass}>{t("adminLabels.fields.key")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.description")}</th>
                <th className={tableHeadClass}>{t("admin.status")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.rollout")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.lastChanged")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((flag) => {
                const expanded = expandedKey === flag.key;
                const showEnvHint =
                  flag.key === "billing_enabled" &&
                  billingEnvEnabled &&
                  !flag.enabledGlobal;

                return (
                  <Fragment key={flag.key}>
                    <tr className="transition-colors hover:bg-rn-surface-row-hover">
                      <td className={tableCellClass}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedKey(expanded ? null : flag.key)
                          }
                          className="inline-flex size-8 items-center justify-center rounded-md border-2 border-rn-border-strong text-muted-foreground transition-colors hover:bg-muted/40"
                          aria-expanded={expanded ? "true" : "false"}
                          aria-label={expanded ? t("admin.skjul_detaljer") : t("admin.vis_detaljer")}
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className={cn(tableCellClass, "admin-ops-mono font-medium")}>
                        {flag.key}
                      </td>
                      <td className={tableCellClass}>
                        <p>{flag.description}</p>
                        {showEnvHint ? (
                          <p className="mt-1 text-app-xs text-amber-700 dark:text-amber-300">
                            {t("admin.env_fallback_aktiv")}
                          </p>
                        ) : null}
                      </td>
                      <td className={tableCellClass}>
                        <FeatureFlagStatusBadge flag={flag} />
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex min-w-[5rem] items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-success transition-all"
                              style={{
                                width: `${flag.enabledGlobal ? 100 : flag.rolloutPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-app-xs tabular-nums">
                            {flag.enabledGlobal ? "100" : flag.rolloutPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {format(new Date(flag.updatedAt), "d. MMM yyyy HH:mm", {
                          locale: getDateFnsLocale(locale),
                        })}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={6} className="bg-muted/10 px-6 py-4 md:px-8">
                          <FeatureFlagDetailPanel
                            flag={flag}
                            orgNames={orgNames}
                            billingEnvEnabled={billingEnvEnabled}
                            busy={busyKey === flag.key}
                            onRequestGlobalToggle={(enabled) =>
                              setConfirmToggle({ key: flag.key, enabled })
                            }
                            onUpdated={() => router.refresh()}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        {t("adminLabels.empty.noFlagsInFilter")}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {t("admin.juster_soket_eller_bytt_filter_nullstill_ved_a_velge_alle_og")}
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
            {t("admin.viser_av_flagg", {
              shown: filtered.length,
              total: flags.length,
            })}
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          {t("admin.feature_flags_changes_logged_prefix")}{" "}
          <Link
            href={adminAuditHref({
              category: "platform",
              action: "feature_flag.updated",
            })}
            className="font-semibold text-success hover:underline"
          >
            {t("admin.revisjonslogg")}
          </Link>
          {t("admin.feature_flags_changes_logged_suffix")}
        </p>
      </div>

      <AdminConfirmActionDialog
        open={confirmToggle !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmToggle(null);
        }}
        title={
          confirmToggle?.enabled
            ? t("admin.aktiver_globalt_2")
            : t("admin.deaktiver_globalt_2")
        }
        description={
          confirmFlag ? (
            <>
              <span className="font-mono">{confirmFlag.key}</span>
              {confirmFlag.key === "billing_enabled" && !confirmToggle?.enabled ? (
                <>
                  {" "}
                  — dette slår av selvbetjent Stripe-fakturering for alle
                  organisasjoner (med mindre miljøvariabel overstyrer).
                </>
              ) : (
                <> — {confirmFlag.description}</>
              )}
            </>
          ) : (
            t("admin.bekreft_endring_av_funksjonsflagg")
          )
        }
        confirmLabel={confirmToggle?.enabled ? t("admin.aktiver") : t("admin.deaktiver")}
        confirmVariant={confirmToggle?.enabled ? "default" : "destructive"}
        busy={busyKey !== null}
        onConfirm={() => void handleConfirmGlobalToggle()}
      />
    </div>
  );
}
