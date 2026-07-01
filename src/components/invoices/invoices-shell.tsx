"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { InvoiceSegmentFilter } from "@/components/invoices/invoice-segment-filter";
import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/client";
import {
  localCalendarTodayYmd,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
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
  const [filter, setFilter] = useState<InvoiceRowFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
            title={t("appPages.invoices.title")}
            actions={
              <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 md:gap-4">
                <div className="relative min-w-0 w-full sm:max-w-xs md:max-w-sm lg:max-w-md">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                    aria-hidden
                  />
                  <Input
                    id="invoices-search"
                    aria-label={t("invoices.searchAria")}
                    className="h-12 w-full min-w-0 rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                    placeholder={t("invoices.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {rows.length > 0 ? (
                  <InvoiceSegmentFilter
                    rows={rows}
                    todayYmd={todayYmd}
                    filter={filter}
                    onFilterChange={setFilter}
                    className="w-full shrink-0 sm:w-auto"
                  />
                ) : null}
              </div>
            }
            actionsClassName="w-full md:min-w-0 md:flex-1 md:justify-end"
          />
        </div>

        <InvoicesWorkspace
          rows={rows}
          filter={filter}
          searchQuery={searchQuery}
          todayYmd={todayYmd}
          canMarkInvoicesPaid={canMarkInvoicesPaid}
        />
      </div>
    </div>
  );
}
