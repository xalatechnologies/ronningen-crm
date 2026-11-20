"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import { bookingPaymentStatusLabel } from "@/constants/booking-payment-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge, statusDotClass, statusTextClass, type StatusTone } from "@/components/ui/status-badge";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { useTranslation } from "@/i18n/client";
import {
  type InvoiceRowFilter,
  daysRelativeToDue,
  effectiveDueIso,
  isOverdue,
  matchesInvoiceFilter,
  matchesInvoiceSearch,
  suggestInkassoReview,
} from "@/lib/invoice-row-utils";
import { cn } from "@/lib/utils";
import { APP_DATA_BODY, APP_DATA_DATE, APP_TABLE_HEAD_CELL } from "@/lib/table-typography";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useSupabase } from "@/providers/supabase-provider";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TENANT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

const invoicesTableHeadClass = cn("invoices-table-head", APP_TABLE_HEAD_CELL);
const invoicesTableCellClass = "px-4 py-4 align-top sm:px-6";

function paidSharePct(row: UnpaidInvoiceRow): number {
  if (row.totalNok <= 0) return 0;
  return Math.min(100, Math.round((row.paidNok / row.totalNok) * 100));
}

function DueAndWarnings({
  row,
  todayYmd,
}: {
  row: UnpaidInvoiceRow;
  todayYmd: string;
}) {
  const { t, formatDate } = useTranslation();
  const due = effectiveDueIso(row);
  const overdue = isOverdue(row, todayYmd);
  const rel = daysRelativeToDue(row, todayYmd);
  const customDue = row.paymentDueDateIso != null;
  const suggestInkasso = suggestInkassoReview(row, todayYmd);

  let relLabel: string;
  if (rel === 0) {
    relLabel = t("invoices.workspace.dueToday");
  } else if (rel > 0) {
    relLabel =
      rel === 1
        ? t("invoices.workspace.oneDayOverdue")
        : t("invoices.workspace.daysOverdue", { count: rel });
  } else if (rel === -1) {
    relLabel = t("invoices.workspace.dueTomorrow");
  } else {
    relLabel = t("invoices.workspace.dueInDays", { count: Math.abs(rel) });
  }

  return (
    <div className="flex min-w-0 max-w-72 flex-col gap-2">
      <div>
        <div className={cn("font-heading invoices-due-date", APP_DATA_DATE)}>
          {formatDate(`${due.slice(0, 10)}T12:00:00`)}
        </div>
        {customDue ? (
          <p className="invoices-row-caption mt-0.5">
            {t("invoices.workspace.customDue")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        {overdue ? (
          <StatusBadge tone="danger" size="md" className="invoices-alert-pill">
            {t("invoices.workspace.overdueBadge", { label: relLabel })}
          </StatusBadge>
        ) : rel === 0 ? (
          <StatusBadge tone="warning" className="invoices-alert-pill">
            {t("invoices.workspace.dueToday")}
          </StatusBadge>
        ) : (
          <span className="invoices-row-meta leading-snug">{relLabel}</span>
        )}
        {row.collectionNoticeSentAt ? (
          <StatusBadge tone="info" dot={false} className="invoices-alert-pill h-auto max-w-full items-start gap-1 rounded-xl py-1.5 text-left leading-snug">
            <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("invoices.workspace.collectionNotice", {
              date: formatDate(row.collectionNoticeSentAt),
            })}
          </StatusBadge>
        ) : suggestInkasso ? (
          <StatusBadge tone="warning" dot={false} className="invoices-alert-pill h-auto max-w-full items-start gap-1 rounded-xl py-1.5 text-left leading-snug">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("invoices.workspace.suggestCollection")}
          </StatusBadge>
        ) : null}
      </div>
    </div>
  );
}

function PaymentColumn({ row }: { row: UnpaidInvoiceRow }) {
  const { t, formatCurrency } = useTranslation();
  const pct = paidSharePct(row);
  const paymentLabel = bookingPaymentStatusLabel(row.paymentStatus, t);

  const paymentTone: StatusTone = (
    {
      paid: "success",
      unpaid: "neutral",
      partial: "warning",
      waived: "neutral",
      disputed: "danger",
      other: "info",
    } as Record<string, StatusTone>
  )[row.paymentStatus] ?? "info";

  const unpaid = row.paidNok <= 0;

  return (
    <div className="flex min-w-36 max-w-56 flex-col items-start gap-2">
      <StatusBadge tone={paymentTone} className="invoices-status-pill">
        {paymentLabel}
      </StatusBadge>
      {row.paymentStatus === "partial" ? (
        <span className="invoices-row-caption font-semibold">
          {t("invoices.workspace.percentPaid", { pct })}
        </span>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 tabular-nums">
        <span className={cn("invoices-payment-major font-bold", statusTextClass("success"))}>
          {formatCurrency(row.paidNok)}
        </span>
        <span className="invoices-payment-slash">/</span>
        <span className="invoices-payment-major font-semibold text-foreground">
          {formatCurrency(row.totalNok)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("invoices.workspace.paidProgressAria", { pct })}
      >
        <div
          className={cn(
            "h-full min-w-0 rounded-full transition-[width]",
            unpaid ? "bg-muted-foreground/30" : statusDotClass("success"),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MarkInvoicePaidButton({
  row,
  canMark,
  busy,
  onRequestConfirm,
}: {
  row: UnpaidInvoiceRow;
  canMark: boolean;
  busy: boolean;
  onRequestConfirm: () => void;
}) {
  const { t } = useTranslation();
  if (!canMark) return null;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy || row.remainingNok <= 0}
      title={t("invoices.markPaidTitle")}
      className={cn(
        "invoices-action-btn h-10 w-full justify-center gap-1.5 rounded-xl border border-status-success-border bg-status-success-bg px-3 font-heading font-bold text-status-success-text shadow-none hover:bg-status-success-bg/70 md:gap-2 md:px-4",
        busy && "opacity-70",
      )}
      onClick={onRequestConfirm}
    >
      <CheckCircle2 className="size-3.5 shrink-0 md:size-4" aria-hidden />
      {t("invoices.workspace.markPaid")}
    </Button>
  );
}

export type InvoicesWorkspaceProps = {
  rows: UnpaidInvoiceRow[];
  filter: InvoiceRowFilter;
  searchQuery?: string;
  todayYmd: string;
  canMarkInvoicesPaid?: boolean;
};

export function InvoicesWorkspace({
  rows,
  filter,
  searchQuery = "",
  todayYmd,
  canMarkInvoicesPaid = false,
}: InvoicesWorkspaceProps) {
  const { t, formatCurrency } = useTranslation();
  const supabase = useSupabase();
  const { invalidateInvoices } = useTenantDataInvalidation();
  const [markPaidConfirmRow, setMarkPaidConfirmRow] =
    useState<UnpaidInvoiceRow | null>(null);
  const [markingBookingId, setMarkingBookingId] = useState<string | null>(null);
  const markingBusy =
    markPaidConfirmRow != null && markingBookingId === markPaidConfirmRow.id;
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesInvoiceFilter(r, filter, todayYmd) &&
          matchesInvoiceSearch(r, searchQuery),
      ),
    [rows, filter, searchQuery, todayYmd],
  );
  const hasSearchQuery = searchQuery.trim() !== "";

  // Page resets to 1 whenever the filter or the search text changes.
  const pageKey = `${filter}|${searchQuery}`;
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(filtered.length / TENANT_LIST_PAGE_SIZE));
  const currentPage = Math.min(pageState.key === pageKey ? pageState.page : 1, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * TENANT_LIST_PAGE_SIZE,
    currentPage * TENANT_LIST_PAGE_SIZE,
  );
  const goToPage = (next: number) =>
    setPageState({ key: pageKey, page: Math.min(Math.max(1, next), totalPages) });

  async function confirmMarkPaid() {
    if (!markPaidConfirmRow) return;

    const row = markPaidConfirmRow;
    setMarkingBookingId(row.id);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          paid_amount: row.totalNok,
          remaining_amount: 0,
          payment_status: "paid",
        })
        .eq("id", row.id);

      if (error) {
        toast.error(t("invoices.workspace.updatePaymentFailed"), {
          description: error.message,
        });
        return;
      }

      setMarkPaidConfirmRow(null);
      toast.success(t("invoices.workspace.markedPaid"));
      invalidateInvoices();
    } finally {
      setMarkingBookingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <section className="min-w-0" aria-label={t("invoices.noOutstandingAria")}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
          <div
            className="flex size-16 items-center justify-center rounded-2xl bg-muted md:size-18"
            aria-hidden
          >
            <FileText className="size-8 text-muted-foreground md:size-9" />
          </div>
          <p className="invoices-empty-hint max-w-md text-muted-foreground">
            {t("invoices.workspace.emptyDescription")}
          </p>
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "invoices-action-btn h-12 rounded-xl border border-foreground/30 bg-card px-6 font-heading font-bold shadow-none hover:bg-muted",
            )}
          >
            {t("invoices.workspace.goToBookings")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0" aria-label={t("invoices.workspace.listAria")}>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center md:py-16">
          <p className="invoices-filter-empty-title font-heading font-semibold text-foreground">
            {hasSearchQuery
              ? t("invoices.workspace.searchEmptyTitle")
              : t("invoices.workspace.filterEmptyTitle")}
          </p>
          <p className="invoices-filter-empty-hint max-w-sm text-muted-foreground">
            {hasSearchQuery
              ? t("invoices.workspace.searchEmptyHint")
              : t("invoices.workspace.filterEmptyHint")}
          </p>
        </div>
      ) : (
        <>
        <div className="app-table hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-0 bg-muted/50">
                <th className={invoicesTableHeadClass}>{t("invoices.customer")}</th>
                <th
                  className={cn(
                    invoicesTableHeadClass,
                    "hidden lg:table-cell",
                  )}
                >
                  {t("invoices.workspace.tableEvent")}
                </th>
                <th className={invoicesTableHeadClass}>
                  {t("invoices.workspace.tablePayment")}
                </th>
                <th className={cn(invoicesTableHeadClass, "min-w-48")}>
                  {t("invoices.dueDate")}
                </th>
                <th
                  className={cn(
                    invoicesTableHeadClass,
                    "hidden text-right md:table-cell",
                  )}
                >
                  {t("invoices.workspace.tableRemaining")}
                </th>
                <th
                  className={cn(
                    "w-[1%] whitespace-nowrap text-right",
                    invoicesTableHeadClass,
                  )}
                >
                  <span className="sr-only">
                    {t("invoices.workspace.tableActionsSr")}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/6">
              {pageRows.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className={invoicesTableCellClass}>
                    <div className="min-w-0 max-w-64">
                      <div className="invoices-row-title truncate font-heading font-semibold text-foreground">
                        {r.customerName}
                      </div>
                      {r.customerEmail ? (
                        <div className="invoices-row-meta mt-0.5 truncate">
                          {r.customerEmail}
                        </div>
                      ) : null}
                      <div className="invoices-row-meta mt-2 lg:hidden">
                        <span className={APP_DATA_BODY}>{r.eventType}</span>
                        <span> · </span>
                        <span className={APP_DATA_DATE}>{r.eventDateLabel}</span>
                      </div>
                      <div className={cn("invoices-rest-amount-mobile mt-2 md:hidden", statusTextClass("danger"))}>
                        {formatCurrency(r.remainingNok)}
                        <div className="invoices-row-caption mt-0.5 font-normal">
                          {t("invoices.workspace.toPay")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    className={cn(
                      invoicesTableCellClass,
                      "hidden lg:table-cell",
                    )}
                  >
                    <div className="flex min-w-0 max-w-56 flex-col gap-2">
                      <StatusBadge tone="neutral" dot={false} className="invoices-row-pill w-fit">
                        {r.eventType}
                      </StatusBadge>
                      <div className={cn("invoices-row-meta", APP_DATA_DATE)}>
                        {r.eventDateLabel}
                      </div>
                      {r.propertyName ? (
                        <div className="invoices-row-caption font-medium">
                          {r.propertyName}
                        </div>
                      ) : null}
                      {r.bookingReference ? (
                        <div className="invoices-row-caption tabular-nums">
                          {t("invoices.workspace.refPrefix")}&nbsp;{r.bookingReference}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className={invoicesTableCellClass}>
                    <PaymentColumn row={r} />
                  </td>
                  <td className={invoicesTableCellClass}>
                    <DueAndWarnings row={r} todayYmd={todayYmd} />
                  </td>
                  <td
                    className={cn(
                      invoicesTableCellClass,
                      "hidden text-right md:table-cell",
                    )}
                  >
                    <div className="inline-block text-right">
                      <div className={cn("invoices-rest-amount font-semibold tabular-nums", statusTextClass("danger"))}>
                        {formatCurrency(r.remainingNok)}
                      </div>
                      <p className="invoices-row-caption mt-1">
                        {t("invoices.workspace.invoiceAmount", {
                          amount: formatCurrency(r.totalNok),
                        })}
                      </p>
                    </div>
                  </td>
                  <td className={cn(invoicesTableCellClass, "text-right")}>
                    <div className="flex min-w-40 flex-col items-stretch gap-2 sm:items-end">
                      <MarkInvoicePaidButton
                        row={r}
                        canMark={canMarkInvoicesPaid}
                        busy={markingBookingId === r.id}
                        onRequestConfirm={() => setMarkPaidConfirmRow(r)}
                      />
                      <Link
                        href={`/app/invoices/print/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "invoices-action-btn inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-foreground/30 bg-card px-3 font-heading font-bold shadow-none hover:bg-muted md:gap-2 md:px-4",
                        )}
                      >
                        {t("invoices.title")}
                        <ExternalLink
                          className="size-3.5 shrink-0 opacity-70 md:size-4"
                          aria-hidden
                        />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-foreground/8 md:hidden">
          {pageRows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="invoices-row-title break-words font-heading font-semibold text-foreground">
                    {r.customerName}
                  </p>
                  <p className="invoices-row-meta mt-0.5">
                    {r.eventType} · {r.eventDateLabel}
                  </p>
                  {r.bookingReference ? (
                    <p className="invoices-row-caption tabular-nums">
                      {t("invoices.workspace.refPrefix")}&nbsp;{r.bookingReference}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("invoices-rest-amount font-semibold tabular-nums", statusTextClass("danger"))}>
                    {formatCurrency(r.remainingNok)}
                  </p>
                  <p className="invoices-row-caption">{t("invoices.workspace.toPay")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PaymentColumn row={r} />
                <DueAndWarnings row={r} todayYmd={todayYmd} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MarkInvoicePaidButton
                  row={r}
                  canMark={canMarkInvoicesPaid}
                  busy={markingBookingId === r.id}
                  onRequestConfirm={() => setMarkPaidConfirmRow(r)}
                />
                <Link
                  href={`/app/invoices/print/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "invoices-action-btn inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-foreground/30 bg-card px-3 font-heading font-bold shadow-none hover:bg-muted",
                  )}
                >
                  {t("invoices.title")}
                  <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-foreground/8 px-4 py-4 text-app-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              {t("customers.footer.showingRange", {
                from: (currentPage - 1) * TENANT_LIST_PAGE_SIZE + 1,
                to: Math.min(currentPage * TENANT_LIST_PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </span>
            {filtered.length > TENANT_LIST_PAGE_SIZE ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-1 rounded-xl border border-foreground/30 bg-card px-3.5 text-app-sm font-semibold shadow-none hover:bg-muted disabled:border-foreground/15"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  {t("customers.footer.prev")}
                </Button>
                <span className="flex items-center px-2 tabular-nums">
                  {t("common.pagination.pageOf", { current: currentPage, total: totalPages })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-1 rounded-xl border border-foreground/30 bg-card px-3.5 text-app-sm font-semibold shadow-none hover:bg-muted disabled:border-foreground/15"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  {t("common.actions.next")}
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
        </>
      )}

      <ConfirmActionDialog
        open={markPaidConfirmRow != null}
        onOpenChange={(open) => {
          if (!open) setMarkPaidConfirmRow(null);
        }}
        title={t("invoices.workspace.confirmMarkPaidTitle")}
        description={
          markPaidConfirmRow ? (
            <div className="space-y-4">
              <p>
                {t("invoices.workspace.confirmMarkPaidIntro", {
                  customer: markPaidConfirmRow.customerName,
                })}
              </p>
              <div className="rounded-xl bg-muted/50 px-4 py-3">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("invoices.workspace.totalPayment")}
                    </dt>
                    <dd className="font-heading font-bold tabular-nums text-success">
                      {formatCurrency(markPaidConfirmRow.totalNok)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("invoices.remainingAfter")}
                    </dt>
                    <dd className="font-heading font-bold tabular-nums text-foreground">
                      {formatCurrency(0)}
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-sm">{t("invoices.workspace.confirmMarkPaidNote")}</p>
            </div>
          ) : null
        }
        confirmLabel={t("invoices.workspace.confirmMarkPaid")}
        busy={markingBusy}
        busyLabel={t("invoices.workspace.registering")}
        confirmClassName="rounded-xl border-0 bg-success !text-white hover:bg-success/90"
        onConfirm={confirmMarkPaid}
      />
    </section>
  );
}
