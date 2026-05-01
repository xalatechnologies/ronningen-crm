"use client";

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
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 pb-24 md:pb-6">
      <header
        className={cn("overflow-hidden", RN_CARD_SHELL)}
        role="banner"
        aria-label="Fakturaer"
      >
        <nav
          className={cn(
            "flex flex-col gap-3 bg-rn-surface-table-head/50 p-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-3",
          )}
          aria-labelledby="invoices-page-title"
        >
          <h1
            id="invoices-page-title"
            className="font-heading shrink-0 text-2xl font-bold tracking-tight text-rn-text-heading sm:text-3xl md:text-4xl"
          >
            Fakturaer
          </h1>
          {rows.length > 0 ? (
            <div className="min-w-0 flex-1 md:flex md:max-w-[min(56rem,100%)] md:justify-end">
              <InvoiceSegmentFilter
                rows={rows}
                todayYmd={todayYmd}
                filter={filter}
                onFilterChange={setFilter}
                className="w-full md:w-auto"
              />
            </div>
          ) : null}
        </nav>
      </header>

      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste bookinger: {loadError}
        </div>
      ) : null}

      <InvoicesWorkspace
        rows={rows}
        filter={filter}
        todayYmd={todayYmd}
        canMarkInvoicesPaid={canMarkInvoicesPaid}
      />
    </div>
  );
}
