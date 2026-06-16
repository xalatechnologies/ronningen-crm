"use client";

import { AdminKpiTile } from "@/components/admin/admin-kpi-tile";
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
import { exportAuditLogCsv } from "@/lib/admin/actions/audit-export";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const tableHeadClass =
  "px-6 py-4 text-left text-app-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

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
      { value: "", label: "Alle handlinger" },
      ...filtered.map(({ action, count }) => ({
        value: action,
        label: `${formatAuditActionLabel(action)} (${count})`,
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
      toast.error("Kunne ikke eksportere");
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "revisjonslogg.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV eksportert");
    router.refresh();
  }

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Revisjonslogg"
            description="Sporbarhet for plattformhandlinger utført av super-administratorer."
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="admin-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AdminKpiTile
              variant="audit"
              label="Totalt"
              value={stats.total}
              caption="Alle registrerte hendelser"
              icon={ClipboardList}
              active={filtersReset}
              onClick={resetFilters}
            />
            <AdminKpiTile
              variant="audit"
              label="Siste 7 dager"
              value={stats.last7Days}
              caption="Hendelser siste uke"
              icon={CalendarDays}
              active={last7DaysActive}
              href={adminAuditLast7DaysHref()}
            />
            <AdminKpiTile
              variant="audit"
              label="Unike administratorer (30 d.)"
              value={stats.uniqueActors30d}
              caption="Aktive plattformadministratorer"
              icon={Users}
            />
            <AdminKpiTile
              variant="audit"
              label="Vanligste handling"
              value={topAction?.count ?? "—"}
              caption={
                topAction
                  ? formatAuditActionLabel(topAction.action)
                  : "Ingen data ennå"
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

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          <table className="w-full min-w-[880px] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-10")} />
                <th className={tableHeadClass}>Tidspunkt</th>
                <th className={tableHeadClass}>Administrator</th>
                <th className={tableHeadClass}>Handling</th>
                <th className={tableHeadClass}>Mål</th>
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
                          aria-label={expanded ? "Skjul detaljer" : "Vis detaljer"}
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
                          locale: nb,
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
                          {formatAuditActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <p className="app-text">
                          {formatAuditTargetLabel(entry.targetType)}
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
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        Ingen hendelser i dette filteret
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        Juster søk, kategori eller periode. Nullstill filtre for
                        å se alle hendelser.
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
                ? "Ingen hendelser i dette filteret"
                : `Viser ${rangeStart}–${rangeEnd} av ${total} hendelser`}
            </p>
            <p className="app-text-muted">
              Side {page} av {totalPages}
            </p>
          </div>
          <div className="flex gap-2">
            <AdminActionButton
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Forrige
            </AdminActionButton>
            <AdminActionButton
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Neste
            </AdminActionButton>
          </div>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Revisjonsloggen inneholder kun handlinger utført av
          plattformadministratorer. Eksporter CSV for arkivering.
        </p>
      </div>
    </div>
  );
}
