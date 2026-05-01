import { InvoicesWorkspace } from "@/components/invoices/invoices-workspace";
import { AppPageHeader } from "@/components/layout/app-page-header";

import type { UnpaidInvoiceRow } from "./types";

export type UnpaidInvoicesSectionProps = {
  rows: UnpaidInvoiceRow[];
  loadError: string | null;
};

export function UnpaidInvoicesSection({
  rows,
  loadError,
}: UnpaidInvoicesSectionProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 pb-24 md:pb-8">
      <AppPageHeader
        title="Fakturaer"
        description="Oversikt over utestående beløp med betalingsstatus, forfall, purring og registrering av innkassovarsel. Åpne «Faktura» for PDF — sett forfall og flagg på bookingen."
      />

      {loadError ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base"
          role="alert"
        >
          Kunne ikke laste bookinger: {loadError}
        </div>
      ) : null}

      <InvoicesWorkspace rows={rows} />
    </div>
  );
}
