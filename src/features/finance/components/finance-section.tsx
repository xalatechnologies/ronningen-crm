"use client";

import { ListPagination } from "@/components/ui/list-pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge, statusTextClass } from "@/components/ui/status-badge";
import { RN_MODAL_MAX_HEIGHT } from "@/lib/rn-ui";
import { APP_DATA_BODY, APP_DATA_DATE, APP_DATA_PRIMARY } from "@/lib/table-typography";
import { isIncomeTransactionType as rowIsIncome } from "@/lib/transaction-income";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import {
  Download,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useTranslation } from "@/i18n/client";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { FinanceFilters } from "@/features/finance/components/finance-filters";
import { FinanceKpis } from "@/features/finance/components/finance-kpis";
import { deleteTransaction } from "@/features/finance/data/transactions";
import { categoryPillClass } from "@/features/finance/lib/finance-category";
import { downloadTransactionsCsv } from "@/features/finance/lib/finance-csv";
import {
  defaultMonthRange,
  formatDisplayDate,
  mergeRangeWithYmd,
  pctDelta,
  previousPeriodBounds,
  sumType,
  transactionYmd,
} from "@/features/finance/lib/finance-math";
import type { TransactionListItem } from "@/features/finance/types";

// The form (react-hook-form, zod, autocomplete) is only needed once a dialog opens.
const TransactionForm = dynamic(() =>
  import("@/features/finance/components/transaction-form").then((m) => ({ default: m.TransactionForm })),
);


const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";


export type FinanceSectionProps = {
  transactions: TransactionListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  /** Server-derived: owner, admin, or accountant */
  canManageTransactions: boolean;
};

const PAGE_SIZE = 20;



export function FinanceSection({
  transactions,
  properties,
  loadError,
  canManageTransactions,
}: FinanceSectionProps) {
  const { t, formatCurrency, formatDate } = useTranslation();
  const supabase = useSupabase();
  const { invalidateFinance } = useTenantDataInvalidation();
  const [range, setRange] = useState({ from: "", to: "" });
  const [propertyId, setPropertyId] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransactionListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionListItem | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  const afterTransactionSaved = useCallback(
    (payload: { transactionDate: string; propertyId: string }) => {
      setPage(1);
      setPropertyId((current) =>
        current !== "" && current !== payload.propertyId ? "" : current,
      );
      setRange((r) => mergeRangeWithYmd(r, payload.transactionDate));
    },
    [],
  );

  const setDateFrom = useCallback((from: string) => {
    setRange((r) => ({ ...r, from }));
    setPage(1);
  }, []);
  const setDateTo = useCallback((to: string) => {
    setRange((r) => ({ ...r, to }));
    setPage(1);
  }, []);

  const hasActiveFilters =
    propertyId !== "" || range.from !== "" || range.to !== "";

  const resetFilters = useCallback(() => {
    setRange({ from: "", to: "" });
    setPropertyId("");
    setPage(1);
  }, []);

  const period = useMemo(() => {
    const from = range.from.trim();
    const to = range.to.trim();
    if (!from && !to) return { from: "", to: "" };
    if (from && to) {
      if (from <= to) return { from, to };
      return { from: to, to: from };
    }
    return { from, to };
  }, [range.from, range.to]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      const d = transactionYmd(t.transaction_date);
      if (period.from && d < period.from) return false;
      if (period.to && d > period.to) return false;
      return true;
    });
  }, [transactions, propertyId, period.from, period.to]);

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

  const comparison = useMemo(() => {
    if (!period.from || !period.to) {
      return {
        prevIncome: 0,
        prevExpense: 0,
        dIncome: null,
        dExpense: null,
      };
    }
    const { prevStart, prevEnd } = previousPeriodBounds(period.from, period.to);
    const prevRows = transactions.filter((t) => {
      if (propertyId && t.property_id !== propertyId) return false;
      const d = transactionYmd(t.transaction_date);
      return d >= prevStart && d <= prevEnd;
    });
    const curIncome = sumType(filtered, true);
    const curExpense = sumType(filtered, false);
    const prevIncome = sumType(prevRows, true);
    const prevExpense = sumType(prevRows, false);
    return {
      prevIncome,
      prevExpense,
      dIncome: pctDelta(prevIncome, curIncome),
      dExpense: pctDelta(prevExpense, curExpense),
    };
  }, [filtered, transactions, propertyId, period.from, period.to]);

  const income = sumType(filtered, true);
  const expense = sumType(filtered, false);
  const net = income - expense;
  const margin = income > 0 ? (net / income) * 100 : null;

  const { totalPages, currentPage, pageRows } = pagination;

  async function confirmDeleteTransaction() {
    const row = deleteTarget;
    if (!row) return;
    setDeleteBusy(true);
    try {
      const { error } = await deleteTransaction(supabase, row.id);

      if (error) {
        toast.error(t("finance.toasts.deleteFailed"), {
          description: error.message,
        });
        return;
      }

      toast.success(t("finance.toasts.deleted"));
      setDeleteTarget(null);
      setEditRow((cur) => (cur?.id === row.id ? null : cur));
      invalidateFinance();
    } finally {
      setDeleteBusy(false);
    }
  }

  const financeColumns = useMemo<DataTableColumn<TransactionListItem>[]>(
    () => [
    {
      id: "date",
      header: t("finance.tableDate"),
      className: cn(APP_DATA_DATE, "finance-row-date"),
      cell: (r) => formatDisplayDate(r.transaction_date, formatDate),
    },
    {
      id: "description",
      header: t("finance.tableDescription"),
      className: cn(APP_DATA_PRIMARY, "finance-row-desc max-w-[240px]"),
      cell: (r) => <span className="line-clamp-2">{r.description?.trim() || "—"}</span>,
    },
    {
      id: "venue",
      header: t("finance.tableVenue"),
      className: cn(APP_DATA_BODY, "finance-row-meta"),
      cell: (r) => r.propertyName ?? "—",
    },
    {
      id: "category",
      header: t("finance.tableCategory"),
      cell: (r) => (
        <span
          className={cn(
            "finance-category-pill inline-flex rounded-full px-3 py-1 font-semibold",
            categoryPillClass(r.category),
          )}
        >
          {r.category}
        </span>
      ),
    },
    {
      id: "type",
      header: t("finance.tableType"),
      cell: (r) => {
        const inc = rowIsIncome(r.type);
        return (
          <StatusBadge tone={inc ? "success" : "danger"}>
            {inc ? t("finance.income") : t("finance.expense")}
          </StatusBadge>
        );
      },
    },
    {
      id: "amount",
      header: t("finance.tableAmount"),
      align: "right",
      className: "finance-row-amount font-bold tabular-nums",
      cell: (r) => {
        const inc = rowIsIncome(r.type);
        return (
          <span className={statusTextClass(inc ? "success" : "danger")}>
            {inc ? "+" : "−"}
            {formatCurrency(Number(r.amount))}
          </span>
        );
      },
    },
    ...(canManageTransactions
      ? [
          {
            id: "actions",
            header: t("finance.editOrDelete"),
            srOnlyHeader: true,
            align: "right" as const,
            headClassName: "min-w-24 px-3",
            className: "min-w-24 px-2 sm:px-3",
            cell: (r: TransactionListItem) => (
              <div className="flex items-center justify-end gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label={t("finance.editTransactionAria", {
                    date: formatDisplayDate(r.transaction_date, formatDate),
                  })}
                  onClick={() => setEditRow(r)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("finance.deleteTransactionAria", {
                    date: formatDisplayDate(r.transaction_date, formatDate),
                  })}
                  onClick={() => setDeleteTarget(r)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ],
    [t, formatCurrency, formatDate, canManageTransactions],
  );

  return (
    <div className="mx-auto flex w-full flex-col pb-24 md:pb-8">
      <div className="finance-page-workspace flex w-full flex-col">
      {loadError ? (
        <div
          className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          {t("finance.loadError", { error: loadError })}
        </div>
      ) : null}
      <AppPageHeader
        className="mb-0"
        surface="default"
        title={t("finance.title")}
        actions={
          properties.length === 0 && canManageTransactions ? (
            <Button
              nativeButton={false}
              render={<Link href="/app/settings/lokaler" />}
              className={cn(buttonVariants({ variant: "success", size: "cta" }), "rounded-xl shadow-none")}
            >
              <Plus className="size-5" aria-hidden />
              {t("finance.addVenue")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setAddOpen(true)}
              disabled={!canManageTransactions || properties.length === 0}
              title={
                !canManageTransactions
                  ? t("finance.requiresAccess")
                  : properties.length === 0
                    ? t("finance.addVenuesFirst")
                    : undefined
              }
              className={cn(buttonVariants({ variant: "success", size: "cta" }), "rounded-xl shadow-none")}
            >
              <Plus className="size-5" aria-hidden />
              {t("finance.newTransaction")}
            </Button>
          )
        }
      />
      <div className="mt-6 flex min-w-0 flex-col gap-6">
            <FinanceFilters
              properties={properties}
              propertyId={propertyId}
              onPropertyChange={(id) => {
                setPropertyId(id);
                setPage(1);
              }}
              range={range}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
              onThisMonth={() => {
                setRange(defaultMonthRange());
                setPropertyId("");
                setPage(1);
              }}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {!loadError && properties.length === 0 ? (
              <div role="status">
                <div className="rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-text md:text-base">
                  {t("finance.noVenuesHint")}{" "}
                  <Link
                    href="/app/settings/lokaler"
                    className="font-semibold underline underline-offset-2"
                  >
                    {t("finance.registerVenuesLink")}
                  </Link>
                  .
                </div>
              </div>
            ) : null}

            {range.from && range.to && range.from > range.to ? (
              <div>
                <p className="finance-range-hint text-muted-foreground">
                  {t("finance.rangeHint")}
                </p>
              </div>
            ) : null}

            <FinanceKpis income={income} expense={expense} net={net} margin={margin} comparison={comparison} />

            <div className={cardClass}>
              <div className="flex flex-col gap-3 border-b border-foreground/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
                <h2 className="finance-transactions-title app-section-title">
                  {t("finance.transactions")}
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  className="size-11 shrink-0 rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted"
                  onClick={() => downloadTransactionsCsv(filtered, t)}
                  disabled={filtered.length === 0}
                  aria-label={t("finance.downloadCsvAria")}
                  title={t("finance.downloadCsvAria")}
                >
                  <Download className="size-5" aria-hidden />
                </Button>
              </div>

              {filtered.length === 0 ? (
                <div className="finance-empty-hint flex flex-col items-center gap-3 px-6 py-12 text-center text-muted-foreground">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                    <ReceiptText className="size-6" aria-hidden />
                  </span>
                  <p>{t("finance.emptyPeriod")}</p>
                  {properties.length === 0 ? (
                    <p>
                      <Link
                        href="/app/settings/lokaler"
                        className="font-semibold text-success underline underline-offset-2"
                      >
                        {t("finance.emptyRegisterVenues")}
                      </Link>{" "}
                      {t("finance.emptyBeforeTransactions")}
                    </p>
                  ) : canManageTransactions ? (
                    <Button
                      type="button"
                      onClick={() => setAddOpen(true)}
                      className={cn(buttonVariants({ variant: "success", size: "cta" }), "gap-2 rounded-xl shadow-none")}
                    >
                      <Plus className="size-4" aria-hidden />
                      {t("finance.newTransaction")}
                    </Button>
                  ) : (
                    <p>{t("finance.emptyContactAdmin")}</p>
                  )}
                </div>
              ) : (
                <>
                  <DataTable
                    rows={pageRows}
                    getRowKey={(r) => r.id}
                    columns={financeColumns}
                    renderMobileItem={(r) => {
                      const inc = rowIsIncome(r.type);
                      return (
                        <div className="flex flex-col gap-2.5 px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words font-heading font-semibold text-foreground">
                                {r.description?.trim() || "—"}
                              </p>
                              <p className="mt-0.5 text-app-xs text-muted-foreground">
                                {formatDisplayDate(r.transaction_date, formatDate)}
                                {r.propertyName ? ` · ${r.propertyName}` : ""}
                              </p>
                            </div>
                            <p className={cn("shrink-0 font-bold tabular-nums", statusTextClass(inc ? "success" : "danger"))}>
                              {inc ? "+" : "−"}
                              {formatCurrency(Number(r.amount))}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={inc ? "success" : "danger"}>
                                {inc ? t("finance.income") : t("finance.expense")}
                              </StatusBadge>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                  categoryPillClass(r.category),
                                )}
                              >
                                {r.category}
                              </span>
                            </div>
                            {canManageTransactions ? (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-10 rounded-lg text-muted-foreground"
                                  aria-label={t("finance.editTransactionAria", {
                                    date: formatDisplayDate(r.transaction_date, formatDate),
                                  })}
                                  onClick={() => setEditRow(r)}
                                >
                                  <Pencil className="size-4" aria-hidden />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-10 rounded-lg text-muted-foreground hover:text-destructive"
                                  aria-label={t("finance.deleteTransactionAria", {
                                    date: formatDisplayDate(r.transaction_date, formatDate),
                                  })}
                                  onClick={() => setDeleteTarget(r)}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    }}
                  />
                </>
              )}

              {filtered.length > 0 ? (
                <ListPagination
  className="finance-page-footer"
  summary={<>
                    {t("finance.footerShowing", {
                      from: pageRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                      to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                  </>}
  page={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
  alwaysShowControls
/>
              ) : null}
            </div>
      </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className={cn(
            "flex w-[calc(100%-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-foreground/10 bg-card p-0 text-foreground shadow-xl sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
          )}
          showCloseButton
        >
          {addOpen && properties.length > 0 ? (
            <TransactionForm
              key="create-transaction"
              properties={properties}
              existing={null}
              onSaved={afterTransactionSaved}
              onClose={() => setAddOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent
          className={cn(
            "flex w-[calc(100%-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-foreground/10 bg-card p-0 text-foreground shadow-xl sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
          )}
          showCloseButton
        >
          {editRow && properties.length > 0 ? (
            <TransactionForm
              key={editRow.id}
              properties={properties}
              existing={editRow}
              onSaved={afterTransactionSaved}
              onClose={() => setEditRow(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteBusy) setDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] gap-4 rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl sm:max-w-md"
        >
          {deleteTarget ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="app-card-title">
                  {t("finance.delete.title")}
                </DialogTitle>
                <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
                  {formatDisplayDate(deleteTarget.transaction_date, formatDate)} ·{" "}
                  {deleteTarget.description?.trim() || t("finance.delete.noDescription")} ·{" "}
                  {rowIsIncome(deleteTarget.type) ? "+" : "−"}
                  {formatCurrency(Number(deleteTarget.amount))}. {t("finance.delete.cannotUndo")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="cta"
                  className="w-full rounded-xl border border-foreground/30 bg-card shadow-none hover:bg-muted sm:w-auto"
                  disabled={deleteBusy}
                  onClick={() => setDeleteTarget(null)}
                >
                  {t("common.actions.cancel")}
                </Button>
                <Button
                  type="button"
                  size="cta"
                  disabled={deleteBusy}
                  className="w-full rounded-xl border-0 bg-red-600 !text-white shadow-none hover:bg-red-700 sm:w-auto"
                  onClick={() => void confirmDeleteTransaction()}
                >
                  {deleteBusy ? t("common.deleting") : t("finance.delete.confirm")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
