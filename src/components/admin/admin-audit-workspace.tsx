"use client";

import { AuditEntryDetailPanel } from "@/components/admin/audit-entry-detail-panel";
import {
  AdminAuditFilterBar,
  type AdminAuditCategory,
} from "@/components/admin/admin-audit-filters";
import { AdminAuditToolbar } from "@/components/admin/admin-audit-toolbar";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import { adminAuditHref, adminAuditLast7DaysHref } from "@/lib/admin/dashboard-links";
import {
  matchesAuditCategory,
  resolveAuditCategory,
} from "@/lib/admin/audit-categories";
import {
  formatAuditActionLabel,
  formatAuditTargetLabel,
} from "@/lib/admin/audit-labels";
import type {
  AdminAuditEntry,
  AdminAuditOverviewStats,
} from "@/lib/admin/queries/users-billing-audit";
import { useTranslation } from "@/i18n/client";
import { exportAuditLogCsv } from "@/lib/admin/actions/audit-export";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Users,
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

const kpiInteractiveClass =
  "group w-full text-left transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30";

const kpiActiveClass = "border-success/40 bg-muted/20 ring-2 ring-success/25";

function AuditKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  active,
  onClick,
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
  onClick?: () => void;
  href?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  const { t } = useTranslation();
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

  if (href) {
    return (
      <Link
        href={href}
        className={cn(kpiTileClass, kpiInteractiveClass, active && kpiActiveClass)}
      >
        {content}
        <span className="sr-only">{t("admin.overview_go_to", { label })}</span>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(kpiTileClass, kpiInteractiveClass, active && kpiActiveClass)}
      >
        {content}
      </button>
    );
  }

  return <div className={kpiTileClass}>{content}</div>;
}

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isLast7DaysApplied(from: string, to: string): boolean {
  return from === isoDateDaysAgo(7) && to === todayIso();
}

type AdminAuditWorkspaceProps = {
  entries: AdminAuditEntry[];
  total: number;
  stats: AdminAuditOverviewStats;
  page: number;
  pageSize: number;
  selectedCategory: AdminAuditCategory;
  selectedAction: string;
  initialSearch: string;
  fromDate?: string;
  toDate?: string;
};

function auditTargetHref(entry: AdminAuditEntry): string | null {
  if (!entry.targetId) return null;
  if (entry.targetType === "organization") {
    return adminRoutes.organizationDetail(entry.targetId);
  }
  if (entry.targetType === "user") {
    return adminRoutes.userDetail(entry.targetId);
  }
  return null;
}

export function AdminAuditWorkspace({
  entries,
  total,
  stats,
  page,
  pageSize,
  selectedCategory,
  selectedAction,
  initialSearch,
  fromDate = "",
  toDate = "",
}: AdminAuditWorkspaceProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const actionOptions = useMemo(() => {
    const filtered = stats.actionCounts.filter(({ action }) =>
      matchesAuditCategory(action, selectedCategory),
    );
    return [
      { value: "", label: t("admin.alle_handlinger") },
      ...filtered.map(({ action, count }) => ({
        value: action,
        label: `${formatAuditActionLabel(action, t)} (${count})`,
      })),
    ];
  }, [stats.actionCounts, selectedCategory]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const topAction = stats.topAction;

  const filtersReset =
    selectedCategory === "all" &&
    !selectedAction &&
    !initialSearch.trim() &&
    !fromDate &&
    !toDate;

  const last7DaysActive = isLast7DaysApplied(fromDate, toDate);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${adminRoutes.audit}?${query}` : adminRoutes.audit);
  }

  function updateCategory(category: AdminAuditCategory) {
    pushParams((params) => {
      if (category === "all") params.delete("category");
      else params.set("category", category);
      params.delete("action");
      params.delete("page");
    });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    pushParams((params) => {
      if (!nextSearch.trim()) params.delete("q");
      else params.set("q", nextSearch.trim());
      params.delete("page");
    });
  }

  function updateAction(action: string) {
    pushParams((params) => {
      if (!action) params.delete("action");
      else params.set("action", action);
      params.delete("page");
    });
  }

  function applyDateFilter(nextFrom = from, nextTo = to) {
    setFrom(nextFrom);
    setTo(nextTo);
    pushParams((params) => {
      if (nextFrom) params.set("from", nextFrom);
      else params.delete("from");
      if (nextTo) params.set("to", nextTo);
      else params.delete("to");
      params.delete("page");
    });
  }

  function applyPresetPeriod(nextFrom: string, nextTo: string) {
    applyDateFilter(nextFrom, nextTo);
  }

  function resetFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    router.push(adminRoutes.audit);
  }

  function goToPage(nextPage: number) {
    pushParams((params) => {
      params.set("page", String(nextPage));
    });
  }

  async function handleExport() {
    setExporting(true);
    const result = await exportAuditLogCsv({
      category: selectedCategory === "all" ? undefined : selectedCategory,
      action: selectedAction || undefined,
      q: search.trim() || undefined,
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
    });
    setExporting(false);
    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_eksportere"));
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revisjonslogg.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("admin.csv_eksportert"));
    router.refresh();
  }

  return (
    <div className="admin-page-workspace admin-audit-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.revisjonslogg")}
            description={t("admin.sporbarhet_for_plattformhandlinger_utfort_av_super_administr")}
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AuditKpiTile
              label={t("admin.totalt")}
              value={stats.total}
              caption={t("admin.alle_registrerte_hendelser")}
              icon={ClipboardList}
              active={filtersReset}
              onClick={resetFilters}
            />
            <AuditKpiTile
              label={t("admin.siste_7_dager")}
              value={stats.last7Days}
              caption={t("admin.hendelser_siste_uke")}
              icon={CalendarDays}
              active={last7DaysActive}
              href={adminAuditLast7DaysHref()}
            />
            <AuditKpiTile
              label={t("admin.unike_administratorer_30_d")}
              value={stats.uniqueActors30d}
              caption={t("admin.aktive_plattformadministratorer")}
              icon={Users}
            />
            <AuditKpiTile
              label={t("admin.vanligste_handling")}
              value={topAction?.count ?? "—"}
              caption={
                topAction
                  ? formatAuditActionLabel(topAction.action, t)
                  : t("admin.ingen_data_enna")
              }
              icon={TrendingUp}
              href={
                topAction
                  ? adminAuditHref({
                      action: topAction.action,
                      category: resolveAuditCategory(topAction.action),
                    })
                  : undefined
              }
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminAuditFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            category={selectedCategory}
            onCategoryChange={updateCategory}
            counts={stats.categoryCounts}
          />
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminAuditToolbar
            embedded
            from={from}
            to={to}
            appliedFrom={fromDate}
            appliedTo={toDate}
            onFromChange={setFrom}
            onToChange={setTo}
            onApplyPeriod={() => applyDateFilter()}
            onPresetPeriod={applyPresetPeriod}
            selectedCategory={selectedCategory}
            selectedAction={selectedAction}
            actionOptions={actionOptions}
            onActionChange={updateAction}
            exporting={exporting}
            onExport={() => void handleExport()}
            onReset={resetFilters}
          />
        </section>

        <div className="app-table -mx-px max-w-full overflow-x-auto border-t border-rn-border-strong/50 overscroll-x-contain">
          <table className="w-full min-w-[48rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-10")} />
                <th className={tableHeadClass}>{t("adminLabels.fields.timestamp")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.administrator")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.action")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.target")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {entries.map((entry) => {
                const expanded = expandedId === entry.id;
                const targetHref = auditTargetHref(entry);

                return (
                  <Fragment key={entry.id}>
                    <tr className="transition-colors hover:bg-rn-surface-row-hover">
                      <td className={tableCellClass}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : entry.id)
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
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {format(new Date(entry.createdAt), "d. MMM yyyy HH:mm", {
                          locale: getDateFnsLocale(locale),
                        })}
                      </td>
                      <td className="p-0 align-middle">
                        <AdminTableDetailLink
                          href={adminRoutes.userDetail(entry.actorUserId)}
                          title={entry.actorName ?? entry.actorEmail ?? "—"}
                          subtitle={entry.actorEmail ?? undefined}
                        />
                      </td>
                      <td className={tableCellClass}>
                        <span className="font-heading text-app-sm font-semibold">
                          {formatAuditActionLabel(entry.action, t)}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <p className="app-text">
                          {formatAuditTargetLabel(entry.targetType, t)}
                        </p>
                        {entry.targetId ? (
                          targetHref ? (
                            <Link
                              href={targetHref}
                              className="font-mono text-app-xs text-success hover:underline"
                            >
                              {entry.targetId}
                            </Link>
                          ) : (
                            <p className="font-mono text-app-xs text-muted-foreground">
                              {entry.targetId}
                            </p>
                          )
                        ) : null}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={5} className="bg-muted/10 px-6 py-4 md:px-8">
                          <AuditEntryDetailPanel entry={entry} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">{t("admin.ingen_hendelser_i_dette_filteret")}</p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {t("admin.audit_empty_filter_hint")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <div className="space-y-1">
            <p className="app-text-secondary">
              {total === 0
                ? t("admin.ingen_hendelser_i_dette_filteret")
                : t("admin.viser_range_hendelser", {
                    start: rangeStart,
                    end: rangeEnd,
                    total,
                  })}
            </p>
            <p className="app-text-muted">
              {t("common.pagination.pageOf", {
                current: page,
                total: totalPages,
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <AdminActionButton
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              {t("common.pagination.prevPage")}
            </AdminActionButton>
            <AdminActionButton
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              {t("common.pagination.nextPage")}
            </AdminActionButton>
          </div>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          {t("admin.audit_footer_hint")}
        </p>
      </div>
    </div>
  );
}
