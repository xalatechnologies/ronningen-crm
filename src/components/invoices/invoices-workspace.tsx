"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import { BOOKING_PAYMENT_STATUS_LABELS } from "@/constants/booking-payment-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type InvoiceRowFilter,
  daysRelativeToDue,
  effectiveDueIso,
  isOverdue,
  matchesInvoiceFilter,
  suggestInkassoReview,
} from "@/lib/invoice-row-utils";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMediumDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));
}

function formatNoticeDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const invoicesTableHeadClass =
  "invoices-table-head px-6 py-4 font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const invoicesTableCellClass =
  "px-6 py-5 align-top md:px-8 md:py-6";

function paidSharePct(row: UnpaidInvoiceRow): number {
  if (row.totalNok <= 0) return 0;
  return Math.min(100, Math.round((row.paidNok / row.totalNok) * 100));
}

function DueAndWarnings({
  row,
  todayYmd,
}: {
  row: UnpaidInvoiceRow;
  todayYmd: string;
}) {
  const due = effectiveDueIso(row);
  const overdue = isOverdue(row, todayYmd);
  const rel = daysRelativeToDue(row, todayYmd);
  const customDue = row.paymentDueDateIso != null;
  const suggestInkasso = suggestInkassoReview(row, todayYmd);

  let relLabel: string;
  if (rel === 0) {
    relLabel = "Forfall i dag";
  } else if (rel > 0) {
    relLabel = rel === 1 ? "1 dag over forfall" : `${rel} dager over forfall`;
  } else if (rel === -1) {
    relLabel = "Forfaller i morgen";
  } else {
    relLabel = `Forfaller om ${Math.abs(rel)} dager`;
  }

  return (
    <div className="flex min-w-0 max-w-72 flex-col gap-2">
      <div>
        <div className="font-heading invoices-due-date font-semibold tabular-nums text-foreground">
          {formatMediumDate(due)}
        </div>
        {customDue ? (
          <p className="invoices-row-caption mt-0.5">
            Eget forfall
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        {overdue ? (
          <Badge
            variant="destructive"
            className="invoices-alert-pill h-auto w-fit rounded-md px-2.5 py-1 font-bold leading-snug"
          >
            Forfalt · {relLabel}
          </Badge>
        ) : rel === 0 ? (
          <Badge
            variant="secondary"
            className="invoices-alert-pill h-auto w-fit rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-900"
          >
            Forfall i dag
          </Badge>
        ) : (
          <span className="invoices-row-meta leading-snug">
            {relLabel}
          </span>
        )}
        {row.collectionNoticeSentAt ? (
          <Badge
            variant="secondary"
            className="invoices-alert-pill h-auto w-fit max-w-full flex-wrap items-start gap-1 rounded-md border border-violet-200 bg-violet-50 py-1.5 pl-2 pr-2 text-left font-semibold leading-snug text-violet-900"
          >
            <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Innkassovarsel registrert {formatNoticeDate(row.collectionNoticeSentAt)}
          </Badge>
        ) : suggestInkasso ? (
          <Badge
            variant="outline"
            className="invoices-alert-pill h-auto w-fit max-w-full items-start gap-1 rounded-md border-amber-300 bg-amber-50/80 py-1.5 pl-2 pr-2 text-left font-semibold leading-snug text-amber-950"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-hidden />
            Vurder innkassovarsel (14+ dager over forfall)
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function PaymentColumn({ row }: { row: UnpaidInvoiceRow }) {
  const pct = paidSharePct(row);
  const statusLabel = BOOKING_PAYMENT_STATUS_LABELS[row.paymentStatus];

  const badgeClass = (() => {
    switch (row.paymentStatus) {
      case "paid":
        return "rounded-md border border-emerald-200 bg-emerald-50 font-bold text-emerald-950";
      case "unpaid":
        return "rounded-md border border-border font-bold";
      case "partial":
        return "rounded-md border border-amber-200 bg-amber-50 font-bold text-amber-950";
      case "waived":
        return "rounded-md border border-slate-300 bg-slate-100 font-bold text-slate-800";
      case "disputed":
        return "rounded-md border border-orange-300 bg-orange-50 font-bold text-orange-950";
      case "other":
      default:
        return "rounded-md border border-violet-200 bg-violet-50 font-bold text-violet-950";
    }
  })();

  const unpaid = row.paidNok <= 0;

  return (
    <div className="flex min-w-36 max-w-56 flex-col gap-2">
      <Badge
        variant="outline"
        className={cn(
          "invoices-status-pill h-auto w-fit px-2.5 py-1 font-bold",
          badgeClass,
        )}
      >
        {statusLabel}
      </Badge>
      {row.paymentStatus === "partial" ? (
        <span className="invoices-row-caption font-semibold">
          {pct}% betalt
        </span>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 tabular-nums">
        <span className="invoices-payment-major font-bold text-success">
          {formatNok(row.paidNok)}
        </span>
        <span className="invoices-payment-slash">/</span>
        <span className="invoices-payment-major font-semibold text-foreground">
          {formatNok(row.totalNok)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Betalt ${pct} prosent`}
      >
        <div
          className={cn(
            "h-full min-w-0 rounded-full transition-[width]",
            unpaid ? "bg-muted-foreground/30" : "bg-success",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MarkInvoicePaidButton({
  row,
  canMark,
  busyId,
  onBusyChange,
}: {
  row: UnpaidInvoiceRow;
  canMark: boolean;
  busyId: string | null;
  onBusyChange: (id: string | null) => void;
}) {
  const supabase = useSupabase();
  const router = useRouter();
  const busy = busyId === row.id;

  if (!canMark) return null;

  async function onMarkPaid() {
    const ok = confirm(
      `Registrere full betaling for «${row.customerName}»?\n\n` +
        `Total innbetaling settes til ${formatNok(row.totalNok)}. Restbeløp blir 0 kr.`,
    );
    if (!ok) return;

    onBusyChange(row.id);
    try {
      const total = row.totalNok;
      const { error } = await supabase
        .from("bookings")
        .update({
          paid_amount: total,
          remaining_amount: 0,
          payment_status: "paid",
        })
        .eq("id", row.id);

      if (error) {
        toast.error("Kunne ikke oppdatere betaling", {
          description: error.message,
        });
        return;
      }

      toast.success("Bookingen er markert som fullt betalt");
      router.refresh();
    } finally {
      onBusyChange(null);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy || row.remainingNok <= 0}
      title="Registrer at kunden har betalt hele beløpet"
      className={cn(
        "invoices-action-btn h-10 w-full justify-center gap-1.5 rounded-md border-2 border-success/60 bg-success/10 px-3 font-heading font-bold text-emerald-950 shadow-sm hover:bg-success/20 md:h-11 md:gap-2 md:px-4 dark:text-emerald-100",
        busy && "opacity-70",
      )}
      onClick={() => void onMarkPaid()}
    >
      <CheckCircle2 className="size-3.5 shrink-0 md:size-4" aria-hidden />
      Registrer betalt
    </Button>
  );
}

export type InvoicesWorkspaceProps = {
  rows: UnpaidInvoiceRow[];
  filter: InvoiceRowFilter;
  todayYmd: string;
  canMarkInvoicesPaid?: boolean;
};

export function InvoicesWorkspace({
  rows,
  filter,
  todayYmd,
  canMarkInvoicesPaid = false,
}: InvoicesWorkspaceProps) {
  const [markingBookingId, setMarkingBookingId] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      rows.filter((r) => matchesInvoiceFilter(r, filter, todayYmd)),
    [rows, filter, todayYmd],
  );

  if (rows.length === 0) {
    return (
      <section className="min-w-0" aria-label="Ingen utestående fakturaer">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
          <div
            className="flex size-16 items-center justify-center rounded-md border-2 border-rn-border-strong bg-muted/40 md:size-18"
            aria-hidden
          >
            <FileText className="size-8 text-muted-foreground md:size-9" />
          </div>
          <p className="invoices-empty-hint max-w-md text-muted-foreground">
            Ingen utestående fakturaer. Når en booking har restbeløp, vises den
            her med betalingsstatus, forfall og verktøy for oppfølging.
          </p>
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "invoices-action-btn h-12 rounded-md border-2 border-rn-border-strong px-6 font-heading font-bold",
            )}
          >
            Gå til bookinger
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0" aria-label="Fakturaliste">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center md:py-16">
          <p className="invoices-filter-empty-title font-heading font-semibold text-foreground">
            Ingen treff i filteret
          </p>
          <p className="invoices-filter-empty-hint max-w-sm text-muted-foreground">
            Velg et annet segment over, eller vis alle ubetalte.
          </p>
        </div>
      ) : (
        <div className="app-table overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={invoicesTableHeadClass}>Kunde</th>
                <th
                  className={cn(
                    invoicesTableHeadClass,
                    "hidden lg:table-cell",
                  )}
                >
                  Arrangement
                </th>
                <th className={invoicesTableHeadClass}>Betaling</th>
                <th className={cn(invoicesTableHeadClass, "min-w-48")}>
                  Forfall
                </th>
                <th
                  className={cn(
                    invoicesTableHeadClass,
                    "hidden text-right md:table-cell",
                  )}
                >
                  Rest
                </th>
                <th
                  className={cn(
                    "w-[1%] whitespace-nowrap text-right",
                    invoicesTableHeadClass,
                  )}
                >
                  <span className="sr-only">Faktura og registrer betaling</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-rn-surface-row-hover"
                >
                  <td className={invoicesTableCellClass}>
                    <div className="min-w-0 max-w-64">
                      <div className="invoices-row-title truncate font-heading font-semibold text-foreground">
                        {r.customerName}
                      </div>
                      {r.customerEmail ? (
                        <div className="invoices-row-meta mt-0.5 truncate">
                          {r.customerEmail}
                        </div>
                      ) : null}
                      <div className="invoices-row-meta mt-2 lg:hidden">
                        <span className="font-medium text-foreground">
                          {r.eventType}
                        </span>
                        <span> · </span>
                        <span className="tabular-nums">{r.eventDateLabel}</span>
                      </div>
                      <div className="invoices-rest-amount-mobile mt-2 text-destructive md:hidden">
                        {formatNok(r.remainingNok)}
                        <div className="invoices-row-caption mt-0.5 font-normal">
                          å betale
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    className={cn(
                      invoicesTableCellClass,
                      "hidden lg:table-cell",
                    )}
                  >
                    <div className="flex min-w-0 max-w-56 flex-col gap-2">
                      <span className="invoices-row-pill inline-flex w-fit rounded-md border border-success/30 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100">
                        {r.eventType}
                      </span>
                      <div className="invoices-row-meta tabular-nums">
                        {r.eventDateLabel}
                      </div>
                      {r.propertyName ? (
                        <div className="invoices-row-caption font-medium">
                          {r.propertyName}
                        </div>
                      ) : null}
                      {r.bookingReference ? (
                        <div className="invoices-row-caption tabular-nums">
                          Ref.&nbsp;{r.bookingReference}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className={invoicesTableCellClass}>
                    <PaymentColumn row={r} />
                  </td>
                  <td className={invoicesTableCellClass}>
                    <DueAndWarnings row={r} todayYmd={todayYmd} />
                  </td>
                  <td
                    className={cn(
                      invoicesTableCellClass,
                      "hidden text-right md:table-cell",
                    )}
                  >
                    <div className="inline-block text-right">
                      <div className="invoices-rest-amount font-heading font-bold text-destructive">
                        {formatNok(r.remainingNok)}
                      </div>
                      <p className="invoices-row-caption mt-1">
                        Faktura {formatNok(r.totalNok)}
                      </p>
                    </div>
                  </td>
                  <td className={cn(invoicesTableCellClass, "text-right")}>
                    <div className="flex min-w-42 flex-col items-stretch gap-2 sm:min-w-44 sm:items-end">
                      <MarkInvoicePaidButton
                        row={r}
                        canMark={canMarkInvoicesPaid}
                        busyId={markingBookingId}
                        onBusyChange={setMarkingBookingId}
                      />
                      <Link
                        href={`/app/invoices/print/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "invoices-action-btn inline-flex h-10 items-center justify-center gap-1.5 rounded-md border-2 border-rn-border-strong px-3 font-heading font-bold md:h-11 md:gap-2 md:px-4",
                        )}
                      >
                        Faktura
                        <ExternalLink
                          className="size-3.5 shrink-0 opacity-70 md:size-4"
                          aria-hidden
                        />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
