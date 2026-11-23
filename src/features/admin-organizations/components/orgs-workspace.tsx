"use client";

import { Download, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { adminRoutes } from "@/config/admin-routes";
import { BulkBar } from "@/features/admin-organizations/components/bulk-bar";
import { ExtendTrialDialog, SuspendDialog } from "@/features/admin-organizations/components/bulk-dialogs";
import { OrgStats } from "@/features/admin-organizations/components/org-stats";
import { OrgsTable } from "@/features/admin-organizations/components/orgs-table";
import {
  ORG_FILTERS,
  buildOrgQuery,
  computeOrgFilterCounts,
  computeOrgOverviewStats,
  matchesOrgFilter,
  parseOrgStatus,
  sortOrganizations,
  summarizeBulk,
  type AdminOrgFilterStatus,
  type BulkResult,
  type OrgSortKey,
  type SortDirection,
} from "@/features/admin-organizations/lib/org-list";
import { useTranslation } from "@/i18n/client";
import { bulkExtendTrial, bulkSuspendOrganizations, bulkUnsuspendOrganizations, exportOrganizationsCsv } from "@/lib/admin/actions/organizations-bulk";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { usePagedList } from "@/lib/use-paged-list";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type Props = { organizations: AdminOrganizationRow[]; nowIso: string; billingEnabled: boolean };

/** Platform admin's list of organizations: numbers on top, filter and search, a sortable table, and bulk actions. */
export function OrgsWorkspace({ organizations, nowIso, billingEnabled }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const status = parseOrgStatus(searchParams.get("status"));
  const search = searchParams.get("q") ?? "";
  const [sort, setSort] = useState<{ key: OrgSortKey; direction: SortDirection }>({ key: "lastActivityAt", direction: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDays, setTrialDays] = useState("7");

  const counts = useMemo(() => computeOrgFilterCounts(organizations), [organizations]);
  const stats = useMemo(() => computeOrgOverviewStats(organizations), [organizations]);
  const filtered = useMemo(
    () => sortOrganizations(organizations.filter((org) => matchesOrgFilter(org, search, status)), sort.key, sort.direction),
    [organizations, search, status, sort],
  );
  const paged = usePagedList(filtered, PAGE_SIZE, `${status}|${search}|${sort.key}|${sort.direction}`);
  const allSelected = filtered.length > 0 && filtered.every((org) => selected.has(org.id));

  function go(next: { status?: AdminOrgFilterStatus; q?: string }) {
    const query = buildOrgQuery({ status: next.status ?? status, q: next.q ?? search });
    router.replace(query ? `${adminRoutes.organizations}?${query}` : adminRoutes.organizations, { scroll: false });
  }

  function onSort(key: OrgSortKey) {
    setSort((current) => (current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: key === "name" ? "asc" : "desc" }));
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Runs a bulk action, then reports honestly: all done, or how many failed (those stay selected). */
  async function runBulk(action: () => Promise<{ ok: true; results: BulkResult[] }>, successText: string, afterSuccess: () => void) {
    setBusy(true);
    try {
      const { results } = await action();
      const summary = summarizeBulk(results);
      if (summary.failedIds.length === 0) {
        toast.success(successText);
        setSelected(new Set());
      } else {
        toast.error(t("admin.orgs_partial_failed", { failed: summary.failedIds.length, total: summary.total, error: summary.firstError ?? "" }));
        setSelected(new Set(summary.failedIds));
      }
      afterSuccess();
      router.refresh();
    } catch {
      toast.error(t("common.toasts.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv(ids: string[]) {
    setBusy(true);
    try {
      const result = await exportOrganizationsCsv(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "organisasjoner.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("admin.csv_eksportert"));
    } finally {
      setBusy(false);
    }
  }

  const ids = [...selected];

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col gap-6 pb-8">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="px-5 py-5 sm:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.organisasjoner")}
            description={t("admin.oversikt_over_leietakerorganisasjoner_helse_og_tilgangsstatu")}
            actions={
              <Button type="button" variant="outline" disabled={busy} onClick={() => void exportCsv([])}>
                <Download className="size-4" aria-hidden />
                {t("admin.eksporter_csv")}
              </Button>
            }
          />
        </div>
      </div>

      <OrgStats stats={stats} />

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:px-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => go({ q: event.target.value })}
              placeholder={t("admin.sok_navn_slug_e_post_org_nr")}
              aria-label={t("admin.sok_organisasjoner")}
              className="h-10 w-full rounded-xl border border-foreground/25 bg-background pr-3 pl-9 text-app-sm outline-none placeholder:text-muted-foreground focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
            />
          </div>
          <div role="group" aria-label={t("admin.filtrer_organisasjoner")} className="flex flex-wrap gap-1.5">
            {ORG_FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={status === name}
                onClick={() => go({ status: name })}
                className={cn(
                  "rounded-full px-3 py-1 text-app-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  status === name ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`admin.${FILTER_KEY[name]}`)} <span className="tabular-nums opacity-70">{counts[name]}</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="space-y-2 px-6 py-16 text-center">
            <p className="font-heading text-lg font-bold text-foreground">{organizations.length === 0 ? t("admin.ingen_organisasjoner_enna") : t("admin.ingen_treff_i_listen")}</p>
            <p className="mx-auto max-w-lg text-muted-foreground">
              {organizations.length === 0 ? t("admin.nye_organisasjoner_vises_her_nar_de_registrerer_seg") : t("admin.juster_soket_eller_bytt_filter_nullstill_ved_a_velge_alle_og")}
            </p>
          </div>
        ) : (
          <OrgsTable
            rows={paged.pageItems}
            selected={selected}
            allSelected={allSelected}
            sortKey={sort.key}
            sortDirection={sort.direction}
            now={now}
            billingEnabled={billingEnabled}
            onSort={onSort}
            onToggleAll={(checked) => setSelected(checked ? new Set(filtered.map((o) => o.id)) : new Set())}
            onToggleOne={toggleOne}
          />
        )}

        <ListPagination
          page={paged.page}
          totalPages={paged.totalPages}
          onPageChange={paged.goToPage}
          summary={t("admin.viser_av_organisasjoner", { shown: paged.pageItems.length, total: filtered.length })}
        />
      </div>

      <BulkBar
        count={selected.size}
        busy={busy}
        onSuspend={() => setSuspendOpen(true)}
        onUnsuspend={() => void runBulk(() => bulkUnsuspendOrganizations(ids), t("admin.suspensjon_opphevet"), () => undefined)}
        onExtendTrial={() => setTrialOpen(true)}
        onExport={() => void exportCsv(ids)}
        onClear={() => setSelected(new Set())}
      />

      <SuspendDialog
        open={suspendOpen}
        count={selected.size}
        reason={suspendReason}
        busy={busy}
        onReasonChange={setSuspendReason}
        onOpenChange={setSuspendOpen}
        onConfirm={() => {
          const reason = suspendReason.trim();
          if (!reason) {
            toast.error(t("admin.angi_en_begrunnelse"));
            return;
          }
          void runBulk(
            () => bulkSuspendOrganizations({ organizationIds: ids, reason }),
            t("admin.organisasjoner_suspendert"),
            () => {
              setSuspendOpen(false);
              setSuspendReason("");
            },
          );
        }}
      />

      <ExtendTrialDialog
        open={trialOpen}
        count={selected.size}
        days={trialDays}
        busy={busy}
        onDaysChange={setTrialDays}
        onOpenChange={setTrialOpen}
        onConfirm={() => {
          const extraDays = Number(trialDays);
          if (!Number.isInteger(extraDays) || extraDays < 1) {
            toast.error(t("admin.angi_et_gyldig_antall_dager"));
            return;
          }
          void runBulk(
            () => bulkExtendTrial({ organizationIds: ids, extraDays }),
            t("admin.proveperiode_utvidet"),
            () => {
              setTrialOpen(false);
              setTrialDays("7");
            },
          );
        }}
      />
    </div>
  );
}

const FILTER_KEY = {
  all: "alle",
  active: "aktive",
  incomplete: "ufullstendig",
  suspended: "suspendert",
  past_due: "forfalt",
  canceled: "avsluttet",
  enterprise: "enterprise",
} as const satisfies Record<AdminOrgFilterStatus, string>;
