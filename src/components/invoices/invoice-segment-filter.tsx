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
    const tone =
      spec.id === "overdue"
        ? ("danger" as const)
        : spec.id === "partial"
          ? ("warning" as const)
          : spec.id === "inkasso"
            ? ("info" as const)
            : undefined;
    return [{ key: spec.id, label: t(FILTER_LABEL_KEYS[spec.id]), count, tone }];
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
