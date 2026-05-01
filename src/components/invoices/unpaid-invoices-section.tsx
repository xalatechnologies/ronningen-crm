import { InvoicesShell } from "@/components/invoices/invoices-shell";

import type { UnpaidInvoiceRow } from "./types";

export type UnpaidInvoicesSectionProps = {
  rows: UnpaidInvoiceRow[];
  loadError: string | null;
  canMarkInvoicesPaid?: boolean;
};

export function UnpaidInvoicesSection({
  rows,
  loadError,
  canMarkInvoicesPaid = false,
}: UnpaidInvoicesSectionProps) {
  return (
    <InvoicesShell
      rows={rows}
      loadError={loadError}
      canMarkInvoicesPaid={canMarkInvoicesPaid}
    />
  );
}
