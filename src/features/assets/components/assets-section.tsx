"use client";

import { ListPagination } from "@/components/ui/list-pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { usePageSearch } from "@/providers/page-search-provider";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { APP_DATA_BODY, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { type AssetStatusBucket } from "@/lib/asset-status-bucket";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import Link from "next/link";
import { Armchair, Box, Building2, Coffee, Download, Package, Pencil, Plus, RotateCcw, Snowflake, Trash2, Wind } from "lucide-react";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import dynamic from "next/dynamic";

import { AssetsKpiSummary } from "@/features/assets/components/assets-kpi-summary";
import { deleteAsset } from "@/features/assets/data/assets";
import { downloadAssetsCsv } from "@/features/assets/lib/assets-csv";
import { computeAssetsStats, filterAssets } from "@/features/assets/lib/assets-stats";
import { INSURANCE_TONE, conditionTone, insurancePresentation, statusFilterLabel } from "@/features/assets/lib/asset-presentation";
import type { AssetListItem } from "@/features/assets/types";

// The form (react-hook-form, zod) is only needed once a dialog opens.
const AssetForm = dynamic(() =>
  import("@/features/assets/components/asset-form").then((m) => ({ default: m.AssetForm })),
);

export type AssetsSectionProps = {
  assets: AssetListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Owner/admin from server — avoids client role flash */
  canManageAssets: boolean;
};

const PAGE_SIZE = 20;







const ICONS = [Package, Armchair, Wind, Coffee, Snowflake, Box] as const;


function assetIconForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return ICONS[h % ICONS.length]!;
}







export function AssetsSection({
  assets,
  properties,
  loadError,
  canManageAssets: canEdit,
}: AssetsSectionProps) {
  const { t, formatCurrency } = useTranslation();
  const supabase = useSupabase();
  const { invalidateAssets } = useTenantDataInvalidation();

  const { query, setQuery } = usePageSearch();
  const [propertyId, setPropertyId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | AssetStatusBucket
  >("all");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{
    open: boolean;
    row: AssetListItem | null;
  }>({ open: false, row: null });
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const filtered = useMemo(
    () => filterAssets(assets, { propertyId, statusFilter, query }),
    [assets, propertyId, statusFilter, query],
  );

  const hasActiveFilters = Boolean(
    query.trim() || propertyId || statusFilter !== "all",
  );

  const filteredStats = useMemo(() => {
    let totalValue = 0;
    let totalUnits = 0;
    for (const a of filtered) {
      totalValue += Number(a.value);
      totalUnits += Number(a.quantity);
    }
    return { totalValue, totalUnits };
  }, [filtered]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return {
      totalPages,
      currentPage,
      pageRows: filtered.slice(start, start + PAGE_SIZE),
    };
  }, [filtered, page]);

  const { totalPages, currentPage, pageRows } = pagination;

  const stats = useMemo(() => computeAssetsStats(assets), [assets]);

  const resetFilters = useCallback(() => {
    setPropertyId("");
    setStatusFilter("all");
    setQuery("");
    setPage(1);
  }, [setQuery]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function confirmDeleteAsset() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await deleteAsset(supabase, deleteTarget.id);
      if (error) {
        toast.error(t("assets.toasts.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(t("assets.toasts.deleted"));
      setDeleteTarget(null);
      invalidateAssets();
    } finally {
      setDeleteBusy(false);
    }
  }

  const assetColumns = useMemo<DataTableColumn<AssetListItem>[]>(
    () => [
    {
      id: "name",
      header: t("common.fields.name"),
      cell: (a) => {
        const Icon = assetIconForName(a.name);
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-rn-text-heading">
              <Icon className="size-5" aria-hidden />
            </div>
            <span className={cn("assets-row-name", APP_DATA_PRIMARY)}>{a.name}</span>
          </div>
        );
      },
    },
    {
      id: "venue",
      header: t("finance.filterVenue"),
      className: cn(APP_DATA_BODY, "assets-row-meta"),
      cell: (a) => a.propertyName ?? "—",
    },
    {
      id: "quantity",
      header: t("assets.tableQuantity"),
      align: "center",
      className: cn(APP_DATA_BODY, "assets-row-qty tabular-nums"),
      cell: (a) => a.quantity,
    },
    {
      id: "value",
      header: t("assets.tableValue"),
      align: "right",
      className: "assets-row-value font-semibold tabular-nums",
      cell: (a) => formatCurrency(Number(a.value)),
    },
    {
      id: "condition",
      header: t("assets.tableCondition"),
      cell: (a) => (
        <StatusBadge tone={conditionTone(a.condition)} className="assets-condition-pill">
          {a.condition?.trim() || t("assets.conditionNotSet")}
        </StatusBadge>
      ),
    },
    {
      id: "insurance",
      header: t("assets.tableInsurance"),
      cell: (a) => {
        const ins = insurancePresentation(a.insurance_status, t);
        return (
          <StatusBadge tone={INSURANCE_TONE[ins.tone]} className="assets-insurance-pill">
            {ins.safeLabel}
          </StatusBadge>
        );
      },
    },
    {
      id: "actions",
      header: t("assets.editOrDelete"),
      srOnlyHeader: true,
      align: "right",
      stopRowClick: true,
      headClassName: "min-w-24 px-3",
      className: "min-w-24 px-2 sm:px-3",
      cell: (a) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canEdit}
            className="size-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label={t("assets.editAria", { name: a.name })}
            onClick={() => setDialog({ open: true, row: a })}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canEdit}
            className="size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            aria-label={t("assets.deleteAria", { name: a.name })}
            onClick={() => setDeleteTarget({ id: a.id, name: a.name })}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ],
    [t, formatCurrency, canEdit],
  );

  return (
    <div className="assets-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="assets-page-header">
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title={t("assets.title")}
            actions={
              <Button
                type="button"
                onClick={() => setDialog({ open: true, row: null })}
                disabled={!canEdit || properties.length === 0}
                title={
                  !canEdit
                    ? t("assets.requiresAccess")
                    : properties.length === 0
                      ? t("assets.addVenuesFirst")
                      : undefined
                }
                className={cn(buttonVariants({ variant: "success", size: "cta" }), "rounded-xl shadow-none")}
              >
                <Plus className="size-5" aria-hidden />
                {t("assets.newItem")}
              </Button>
            }
          />
        </div>

        {loadError ? (
          <div role="alert">
            <div className="assets-load-error rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
              {t("assets.loadError", { error: loadError })}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length === 0 ? (
          <div role="status">
            <div className="assets-setup-hint rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-status-warning-text">
              {t("assets.noVenuesHint")}{" "}
              <Link
                href="/app/settings/lokaler"
                className="font-semibold underline underline-offset-2"
              >
                {t("assets.registerVenuesLink")}
              </Link>{" "}
              {t("assets.beforeAddingAssets")}
            </div>
          </div>
        ) : null}

        {!loadError && properties.length > 0 && assets.length > 0 ? (
          <AssetsKpiSummary
            stats={stats}
            filteredStats={filteredStats}
            filteredCount={filtered.length}
            hasActiveFilters={hasActiveFilters}
            formatCurrency={formatCurrency}
            t={t}
          />
        ) : null}

        <div className="min-w-0 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          <div className="flex flex-col gap-3 border-b border-foreground/8 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-60">
                <Building2
                  className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <FormSelect
                  value={propertyId}
                  onValueChange={(v) => {
                    setPropertyId(v);
                    setPage(1);
                  }}
                  aria-label={t("assets.filterVenueAria")}
                  className="assets-filter-select h-11 min-h-11 rounded-xl border border-foreground/25 py-0 pl-11 shadow-none"
                  placeholder={t("assets.allVenues")}
                  options={toIdNameOptions(properties)}
                />
              </div>
              <SegmentedFilter
                ariaLabel={t("assets.filterConditionAria")}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={[
                  { key: "all", label: statusFilterLabel("all", t), count: stats.rowCount },
                  { key: "operational", label: statusFilterLabel("operational", t), count: stats.counts.operational, tone: "success" },
                  { key: "maintenance", label: statusFilterLabel("maintenance", t), count: stats.counts.maintenance, tone: "warning" },
                  { key: "replace", label: statusFilterLabel("replace", t), count: stats.counts.replace, tone: "danger" },
                ]}
              />
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {assets.length === 0 ? (
                  <span className="assets-toolbar-meta whitespace-nowrap text-muted-foreground">{t("assets.noData")}</span>
                ) : hasActiveFilters ? (
                  <span
                    className="assets-toolbar-meta whitespace-nowrap tabular-nums text-muted-foreground"
                    title={t("assets.visibleOfTotal")}
                  >
                    {filtered.length}/{assets.length}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="assets-toolbar-btn h-11 shrink-0 gap-2 rounded-xl border border-foreground/30 bg-card px-3.5 font-semibold shadow-none hover:bg-muted disabled:border-foreground/15"
                  disabled={filtered.length === 0}
                  onClick={() => downloadAssetsCsv(filtered, t)}
                  aria-label={t("assets.downloadCsvAria")}
                  title={t("assets.downloadCsvTitle")}
                >
                  <Download className="size-4 shrink-0" aria-hidden />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="assets-toolbar-btn h-11 shrink-0 gap-2 rounded-xl px-3.5 font-semibold"
                  disabled={!hasActiveFilters}
                  title={hasActiveFilters ? t("assets.clearFilters") : t("assets.noActiveFilters")}
                  onClick={resetFilters}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  {t("assets.reset")}
                </Button>
              </div>
            </div>
          </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
            <div
              className="flex size-16 items-center justify-center rounded-2xl bg-muted md:size-18"
              aria-hidden
            >
              <Package className="size-8 text-muted-foreground md:size-9" />
            </div>
            <p className="assets-empty-hint max-w-sm text-muted-foreground">
              {assets.length === 0 ? (
                <>
                  {t("assets.emptyNoAssets")}
                  {canEdit && properties.length > 0 ? (
                    <>
                      {" "}
                      {t("assets.emptyUseNewItem")}{" "}
                      <span className="font-medium text-foreground">
                        {t("assets.newItem")}
                      </span>{" "}
                      {t("assets.emptyUseNewItemSuffix")}
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {t("assets.emptyNoMatch")}{" "}
                  <button
                    type="button"
                    className="font-semibold text-success underline underline-offset-2"
                    onClick={resetFilters}
                  >
                    {t("assets.resetFilters")}
                  </button>
                </>
              )}
            </p>
          </div>
        ) : (
          <DataTable
            rows={pageRows}
            getRowKey={(a) => a.id}
            columns={assetColumns}
            onRowClick={canEdit ? (a) => setDialog({ open: true, row: a }) : undefined}
            renderMobileItem={(a) => {
              const Icon = assetIconForName(a.name);
              const ins = insurancePresentation(a.insurance_status, t);
              return (
                <div className="flex flex-col gap-2.5 px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-rn-text-heading">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="assets-row-name break-words font-heading font-semibold text-foreground">{a.name}</p>
                        <p className="mt-0.5 text-app-xs text-muted-foreground">
                          {a.propertyName ?? "—"} · {a.quantity} × {formatCurrency(Number(a.value))}
                        </p>
                      </div>
                      {canEdit ? (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 rounded-lg text-muted-foreground"
                            aria-label={t("assets.editAria", { name: a.name })}
                            onClick={() => setDialog({ open: true, row: a })}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 rounded-lg text-muted-foreground hover:text-destructive"
                            aria-label={t("assets.deleteAria", { name: a.name })}
                            onClick={() => setDeleteTarget({ id: a.id, name: a.name })}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-[3.25rem]">
                      <StatusBadge tone={conditionTone(a.condition)}>
                        {a.condition?.trim() || t("assets.conditionNotSet")}
                      </StatusBadge>
                      <StatusBadge tone={INSURANCE_TONE[ins.tone]}>{ins.safeLabel}</StatusBadge>
                    </div>
                  </div>
              );
            }}
          />
        )}

        {filtered.length > 0 ? (
          <ListPagination
  className="assets-page-footer"
  summary={<>
              {t("assets.footerShowing", {
                from: pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
              {statusFilter !== "all"
                ? ` · ${statusFilterLabel(statusFilter, t)}`
                : null}
            </>}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
  alwaysShowControls
/>
        ) : null}
        </div>
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog({ open: false, row: null });
          else setDialog((s) => ({ ...s, open: true }));
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-lg gap-0 overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-6 text-base shadow-xl sm:max-w-xl md:max-w-2xl md:p-8"
          showCloseButton
        >
          {dialog.open ? (
            properties.length > 0 ? (
              <AssetForm
                key={dialog.row?.id ?? "new"}
                properties={properties}
                row={dialog.row}
                suggestedPropertyId={
                  dialog.row ? undefined : propertyId || undefined
                }
                onClose={() => setDialog({ open: false, row: null })}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading md:text-2xl">
                    {t("assets.cannotAddTitle")}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground md:text-base">
                  {t("assets.cannotAddDescription")}
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted disabled:border-foreground/15 px-6 text-base font-semibold"
                    onClick={() => setDialog({ open: false, row: null })}
                  >
                    {t("common.actions.close")}
                  </Button>
                </DialogFooter>
              </>
            )
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("assets.delete.title")}
        description={
          deleteTarget
            ? t("assets.delete.description", { name: deleteTarget.name })
            : null
        }
        confirmLabel={t("assets.delete.confirm")}
        busy={deleteBusy}
        onConfirm={confirmDeleteAsset}
      />
    </div>
  );
}
