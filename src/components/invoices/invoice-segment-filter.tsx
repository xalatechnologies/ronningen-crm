"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import {
  INVOICE_FILTER_SPECS,
  countInvoiceFilter,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { CalendarClock, Scale } from "lucide-react";

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
      return "border-slate-300 bg-slate-50 text-slate-900 shadow-sm";
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
  return (
    <div
      role="toolbar"
      aria-label="Filtrer utestående fakturaer etter status"
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

        return (
          <button
            key={spec.id}
            type="button"
            title={spec.title}
            aria-pressed={active ? "true" : "false"}
            onClick={() => onFilterChange(spec.id)}
            className={cn(
              "inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left transition-colors md:min-h-12 md:rounded-md md:px-4 md:py-3",
              RN_TEXT_SEGMENT,
              "font-bold",
              active
                ? segmentActiveClass(spec.id)
                : "border-rn-border-strong bg-card text-muted-foreground hover:border-rn-border-strong/80 hover:bg-muted/35",
            )}
          >
            {isAll ? (
              <CalendarClock
                className="size-5 shrink-0 text-primary md:size-6"
                aria-hidden
              />
            ) : isInk ? (
              <Scale
                className={cn(
                  "size-5 shrink-0 md:size-6",
                  active ? "text-violet-800" : "text-muted-foreground",
                )}
                aria-hidden
              />
            ) : null}
            <span className="tabular-nums">{count}</span>
            <span className="font-semibold tracking-wide">{spec.label}</span>
          </button>
        );
      })}
    </div>
  );
}
