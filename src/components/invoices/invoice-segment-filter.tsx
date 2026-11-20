"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import {
  INVOICE_FILTER_SPECS,
  countInvoiceFilter,
  type InvoiceRowFilter,
} from "@/lib/invoice-row-utils";
import { SegmentedFilter } from "@/components/ui/segmented-filter";

const FILTER_LABEL_KEYS: Record<InvoiceRowFilter, TranslationKey> = {
  all: "invoices.filters.all",
  overdue: "invoices.filters.overdue",
  unpaid: "invoices.filters.unpaid",
  partial: "invoices.filters.partial",
  upcoming: "invoices.filters.upcoming",
  inkasso: "invoices.filters.inkasso",
};

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

  const options = INVOICE_FILTER_SPECS.flatMap((spec) => {
    const count = countInvoiceFilter(rows, spec.id, todayYmd);
    const visible = spec.id === "all" || count > 0 || filter === spec.id;
    if (!visible) return [];
    const dot =
      spec.id === "overdue"
        ? "bg-red-500"
        : spec.id === "partial"
          ? "bg-amber-500"
          : spec.id === "inkasso"
            ? "bg-violet-500"
            : undefined;
    return [{ key: spec.id, label: t(FILTER_LABEL_KEYS[spec.id]), count, dot }];
  });

  return (
    <SegmentedFilter
      className={className}
      ariaLabel={t("invoices.filterAria")}
      value={filter}
      onChange={onFilterChange}
      options={options}
    />
  );
}
