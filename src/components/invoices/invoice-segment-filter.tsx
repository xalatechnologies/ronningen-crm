"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import {
  INVOICE_FILTER_SPECS,
  countInvoiceFilter,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { CalendarClock, Scale } from "lucide-react";

const FILTER_LABEL_KEYS: Record<InvoiceRowFilter, TranslationKey> = {
  all: "invoices.filters.all",
  overdue: "invoices.filters.overdue",
  unpaid: "invoices.filters.unpaid",
  partial: "invoices.filters.partial",
  upcoming: "invoices.filters.upcoming",
  inkasso: "invoices.filters.inkasso",
};

const FILTER_TITLE_KEYS: Record<InvoiceRowFilter, TranslationKey> = {
  all: "invoices.filters.allTitle",
  overdue: "invoices.filters.overdueTitle",
  unpaid: "invoices.filters.unpaidTitle",
  partial: "invoices.filters.partialTitle",
  upcoming: "invoices.filters.upcomingTitle",
  inkasso: "invoices.filters.inkassoTitle",
};

function segmentActiveClass(id: InvoiceRowFilter): string {
  switch (id) {
    case "all":
      return "border-success bg-success/15 text-rn-text-heading shadow-sm";
    case "overdue":
      return "border-red-300 bg-red-50 text-red-950 shadow-sm";
    case "partial":
      return "border-amber-300 bg-amber-50 text-amber-950 shadow-sm";
    case "unpaid":
      return "border-rn-border-strong bg-muted/40 text-foreground shadow-sm";
    case "upcoming":
      return "border-border bg-muted text-foreground shadow-sm";
    case "inkasso":
      return "border-violet-300 bg-violet-50 text-violet-950 shadow-sm";
    default:
      return "border-success bg-success/15 text-rn-text-heading shadow-sm";
  }
}

export function InvoiceSegmentFilter({
  rows,
  todayYmd,
  filter,
  onFilterChange,
  className,
}: {
  rows: UnpaidInvoiceRow[];
  todayYmd: string;
  filter: InvoiceRowFilter;
  onFilterChange: (next: InvoiceRowFilter) => void;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="toolbar"
      aria-label={t("invoices.filterAria")}
      className={cn(
        "flex flex-wrap items-center gap-2 md:gap-2.5",
        className,
      )}
    >
      {INVOICE_FILTER_SPECS.map((spec) => {
        const count = countInvoiceFilter(rows, spec.id, todayYmd);
        const visible =
          spec.id === "all" || count > 0 || filter === spec.id;
        if (!visible) return null;

        const active = filter === spec.id;
        const isInk = spec.id === "inkasso";
        const isAll = spec.id === "all";
        const label = t(FILTER_LABEL_KEYS[spec.id]);
        const title = t(FILTER_TITLE_KEYS[spec.id]);

        return (
          <button
            key={spec.id}
            type="button"
            title={title}
            aria-pressed={active ? "true" : "false"}
            onClick={() => onFilterChange(spec.id)}
            className={cn(
              "inline-flex h-12 min-h-12 min-w-0 items-center gap-2 rounded-md border-2 px-3 py-3 text-left transition-colors sm:px-4 md:h-14 md:min-h-14 md:px-5 md:py-3.5",
              RN_TEXT_SEGMENT,
              active
                ? segmentActiveClass(spec.id)
                : "border-rn-border-strong bg-card text-muted-foreground hover:border-rn-border-strong/80 hover:bg-muted/35",
            )}
          >
            {isAll ? (
              <CalendarClock
                className="size-5 shrink-0 text-primary"
                aria-hidden
              />
            ) : isInk ? (
              <Scale
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-violet-800" : "text-muted-foreground",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-md border px-2 py-0.5 text-app-sm font-bold tabular-nums md:text-app-base",
                active
                  ? "border-white/30 bg-white/20 text-inherit"
                  : "border-rn-badge-border bg-rn-badge-surface text-rn-text-ink",
              )}
            >
              {count}
            </span>
            <span className="font-semibold tracking-wide">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
