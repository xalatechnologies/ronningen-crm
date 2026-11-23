"use client";

import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { InvoiceRow, InvoiceStatus } from "@/features/billing/lib/invoice-history";
import { useTranslation } from "@/i18n/client";
import { listInvoices } from "@/lib/billing/actions/list-invoices";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

const TONE: Record<InvoiceStatus, StatusTone> = {
  paid: "success",
  open: "warning",
  uncollectible: "danger",
  void: "neutral",
};

const LINK_CLASS =
  "rounded-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white";

type State = { kind: "loading" } | { kind: "error"; message: string | null } | { kind: "ready"; invoices: InvoiceRow[] };

/** Past Stripe invoices for the subscription, with links to view or download each one. Owner only. */
export function InvoiceHistoryCard({ organizationId }: { organizationId: string }) {
  const { t, locale, formatDate } = useTranslation();
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const result = await listInvoices(organizationId);
      setState(result.ok ? { kind: "ready", invoices: result.invoices } : { kind: "error", message: result.error });
    } catch {
      setState({ kind: "error", message: null });
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const money = (row: InvoiceRow) =>
    new Intl.NumberFormat(locale === "nb" ? "nb-NO" : "en-GB", { style: "currency", currency: row.currency }).format(row.amount);

  return (
    <section aria-labelledby="invoice-history-title" className={cn(RN_CARD_SHELL, "flex flex-col gap-4 p-5 md:p-6")}>
      <div>
        <h2 id="invoice-history-title" className="font-heading text-lg font-semibold text-foreground md:text-xl">
          {t("billing.invoices.title")}
        </h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{t("billing.invoices.description")}</p>
      </div>

      {state.kind === "loading" ? (
        <p role="status" className="text-app-sm text-muted-foreground">
          {t("billing.invoices.loading")}
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-app-sm text-status-danger-text">
          <p>{state.message ?? t("serverErrors.billing.invoicesFailed")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            {t("billing.invoices.retry")}
          </Button>
        </div>
      ) : null}

      {state.kind === "ready" && state.invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/30 px-4 py-8 text-center">
          <FileText className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">{t("billing.invoices.empty")}</p>
          <p className="text-app-sm text-muted-foreground">{t("billing.invoices.emptyHint")}</p>
        </div>
      ) : null}

      {state.kind === "ready" && state.invoices.length > 0 ? (
        <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {state.invoices.map((row) => {
            const number = row.number ?? t("billing.invoices.noNumber");
            return (
              <li key={row.id} className="grid gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[minmax(0,1.2fr)_8rem_9rem_minmax(0,1fr)] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{number}</p>
                  <p className="text-app-xs text-muted-foreground">{formatDate(row.createdIso)}</p>
                </div>
                <p className="text-app-sm font-medium tabular-nums text-foreground md:text-right">{money(row)}</p>
                <div>
                  <StatusBadge tone={TONE[row.status]}>{t(`billing.invoices.statuses.${row.status}`)}</StatusBadge>
                </div>
                <div className="flex gap-4 text-app-sm md:justify-end">
                  {row.viewUrl ? (
                    <a href={row.viewUrl} target="_blank" rel="noopener noreferrer" aria-label={t("billing.invoices.viewAria", { number })} className={LINK_CLASS}>
                      {t("billing.invoices.view")}
                    </a>
                  ) : null}
                  {row.pdfUrl ? (
                    <a href={row.pdfUrl} target="_blank" rel="noopener noreferrer" aria-label={t("billing.invoices.pdfAria", { number })} className={LINK_CLASS}>
                      {t("billing.invoices.pdf")}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
