"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { InvoiceSegmentFilter } from "@/components/invoices/invoice-segment-filter";
import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { useTranslation } from "@/i18n/client";
import { localCalendarTodayYmd, type InvoiceRowFilter } from "@/lib/invoice-row-utils";
import { usePageSearch } from "@/providers/page-search-provider";
import { useMemo, useState } from "react";

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
  const { t } = useTranslation();
  const { query } = usePageSearch();
  const [filter, setFilter] = useState<InvoiceRowFilter>("all");
  const todayYmd = useMemo(() => localCalendarTodayYmd(), []);

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
            actions={
              rows.length > 0 ? (
                <InvoiceSegmentFilter
                  rows={rows}
                  todayYmd={todayYmd}
                  filter={filter}
                  onFilterChange={setFilter}
                  className="w-full shrink-0 sm:w-auto"
                />
              ) : null
            }
            actionsClassName="w-full md:min-w-0 md:flex-1 md:justify-end"
          />
        </div>

        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
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
