"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { InvoiceSegmentFilter } from "@/components/invoices/invoice-segment-filter";
import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { useTranslation } from "@/i18n/client";
import { isOverdue, localCalendarTodayYmd, type InvoiceRowFilter } from "@/lib/invoice-row-utils";
import { usePageSearch } from "@/providers/page-search-provider";
import { useMemo, useState } from "react";

import { StatCard } from "@/components/ui/stat-card";
import { statusTextClass } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { AlarmClock, FileText, Wallet, Scale } from "lucide-react";

import type { UnpaidInvoiceRow } from "./types";

export function InvoicesShell({
  rows,
  loadError,
  canMarkInvoicesPaid = false,
}: {
  rows: UnpaidInvoiceRow[];
  loadError: string | null;
  canMarkInvoicesPaid?: boolean;
}) {
  const { t, formatCurrency } = useTranslation();
  const { query } = usePageSearch();
  const [filter, setFilter] = useState<InvoiceRowFilter>("all");
  const todayYmd = useMemo(() => localCalendarTodayYmd(), []);
  const totals = useMemo(() => {
    let outstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let partial = 0;
    for (const r of rows) {
      outstanding += r.remainingNok;
      if (isOverdue(r, todayYmd)) {
        overdueAmount += r.remainingNok;
        overdueCount += 1;
      }
      if (r.paymentStatus === "partial") partial += 1;
    }
    return { outstanding, overdueAmount, overdueCount, partial };
  }, [rows, todayYmd]);

  return (
    <div className="invoices-page-workspace mx-auto flex w-full flex-col gap-8 pb-8">
      {loadError ? (
        <div
          className="invoices-load-error rounded-xl bg-destructive/10 px-4 py-3 text-destructive"
          role="alert"
        >
          Kunne ikke laste fakturaer: {loadError}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-6">
        <div className="invoices-page-header">
          <AppPageHeader
            className="mb-0"
            surface="default"
            title={t("appPages.invoices.title")}
          />
        </div>

        {rows.length > 0 ? (
          <section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
            aria-label={t("appPages.invoices.title")}
          >
            <StatCard
              icon={Wallet}
              label={t("invoices.workspace.tableRemaining")}
              value={formatCurrency(totals.outstanding)}
              className="col-span-2 lg:col-span-1"
            />
            <StatCard
              icon={AlarmClock}
              label={t("invoices.filters.overdue")}
              value={formatCurrency(totals.overdueAmount)}
              valueClassName={cn(totals.overdueCount > 0 && statusTextClass("danger"))}
            />
            <StatCard
              icon={Scale}
              label={t("invoices.filters.partial")}
              value={totals.partial}
            />
            <StatCard icon={FileText} label={t("invoices.filters.all")} value={rows.length} />
          </section>
        ) : null}

        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          {rows.length > 0 ? (
            <div className="border-b border-foreground/8 px-4 py-3 sm:px-6">
              <InvoiceSegmentFilter
                rows={rows}
                todayYmd={todayYmd}
                filter={filter}
                onFilterChange={setFilter}
              />
            </div>
          ) : null}
          <InvoicesWorkspace
            rows={rows}
            filter={filter}
            searchQuery={query}
            todayYmd={todayYmd}
            canMarkInvoicesPaid={canMarkInvoicesPaid}
          />
        </div>
      </div>
    </div>
  );
}
