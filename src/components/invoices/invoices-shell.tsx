"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { InvoiceSegmentFilter } from "@/components/invoices/invoice-segment-filter";
import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import {
  localCalendarTodayYmd,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
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
  const [filter, setFilter] = useState<InvoiceRowFilter>("all");
  const todayYmd = useMemo(() => localCalendarTodayYmd(), []);

  return (
    <div className="invoices-page-workspace mx-auto flex w-full flex-col gap-8 pb-8">
      {loadError ? (
        <div
          className="invoices-load-error rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive"
          role="alert"
        >
          Kunne ikke laste fakturaer: {loadError}
        </div>
      ) : null}

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div
          className={cn(
            "invoices-page-header border-b-2 border-rn-border-strong bg-card/80",
            "px-[length:var(--app-card-padding)] sm:px-[length:calc(var(--app-card-padding)+0.25rem)] md:px-[length:calc(var(--app-card-padding)+0.5rem)] lg:px-[length:calc(var(--app-card-padding)+0.75rem)]",
            "py-6 md:py-7",
          )}
        >
          <AppPageHeader
            className="mb-0"
            surface="default"
            title="Fakturaer"
            actions={
              rows.length > 0 ? (
                <InvoiceSegmentFilter
                  rows={rows}
                  todayYmd={todayYmd}
                  filter={filter}
                  onFilterChange={setFilter}
                  className="w-full md:w-auto"
                />
              ) : undefined
            }
            actionsClassName="md:max-w-[min(56rem,100%)] md:justify-end"
          />
        </div>

        <InvoicesWorkspace
          rows={rows}
          filter={filter}
          todayYmd={todayYmd}
          canMarkInvoicesPaid={canMarkInvoicesPaid}
        />
      </div>
    </div>
  );
}
