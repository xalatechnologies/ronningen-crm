"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import {
  INVOICE_FILTER_SPECS,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { cn } from "@/lib/utils";

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

export function InvoiceFilterNav({
  filter,
  onFilterChange,
  className,
}: {
  filter: InvoiceRowFilter;
  onFilterChange: (next: InvoiceRowFilter) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const invoiceSelectItems = INVOICE_FILTER_SPECS.map((spec) => ({
    value: spec.id,
    label: t(FILTER_LABEL_KEYS[spec.id]),
  }));

  return (
    <div className={cn("w-full md:w-auto", className)}>
      <Select
        value={filter}
        items={invoiceSelectItems}
        onValueChange={(v) => {
          if (v) onFilterChange(v as InvoiceRowFilter);
        }}
      >
        <SelectTrigger
          aria-label={t("invoices.filterInvoicesAria")}
          className={cn(
            "w-full min-w-0 rounded-md border-2 border-rn-border-strong bg-card px-4 py-3 font-heading text-base font-bold tracking-tight text-rn-text-heading shadow-sm",
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
              title={t(FILTER_TITLE_KEYS[spec.id])}
              className="py-2.5 pl-3 pr-8 font-heading text-base font-semibold"
            >
              {t(FILTER_LABEL_KEYS[spec.id])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
