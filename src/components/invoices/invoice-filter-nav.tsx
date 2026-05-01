"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVOICE_FILTER_SPECS,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { cn } from "@/lib/utils";

/** Base UI Select needs `items` for `<Select.Value>` to show labels when the list is closed. */
const INVOICE_SELECT_ITEMS = INVOICE_FILTER_SPECS.map((spec) => ({
  value: spec.id,
  label: spec.label,
}));

export function InvoiceFilterNav({
  filter,
  onFilterChange,
  className,
}: {
  filter: InvoiceRowFilter;
  onFilterChange: (next: InvoiceRowFilter) => void;
  className?: string;
}) {
  return (
    <div className={cn("w-full md:w-auto", className)}>
      <Select
        value={filter}
        items={INVOICE_SELECT_ITEMS}
        onValueChange={(v) => {
          if (v) onFilterChange(v as InvoiceRowFilter);
        }}
      >
        <SelectTrigger
          aria-label="Filtrer fakturaer"
          className={cn(
            "w-full min-w-0 rounded-md border-2 border-rn-border-strong bg-card px-4 py-3 font-heading text-base font-bold tracking-tight text-rn-text-heading shadow-sm",
            /* SelectTrigger defaults to data-[size=default]:h-8 (32px); match dashboard / forms */
            "data-[size=default]:h-12 data-[size=default]:min-h-12 md:data-[size=default]:h-14 md:py-3.5",
            "[&_svg:not([class*='size-'])]:size-5",
            "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 data-popup-open:border-rn-accent-border",
            "md:min-w-56",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[var(--anchor-width)]">
          {INVOICE_FILTER_SPECS.map((spec) => (
            <SelectItem
              key={spec.id}
              value={spec.id}
              title={spec.title}
              className="py-2.5 pl-3 pr-8 font-heading text-base font-semibold"
            >
              {spec.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
