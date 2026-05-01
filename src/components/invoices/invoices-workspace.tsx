"use client";

import type { UnpaidInvoiceRow } from "@/components/invoices/types";
import { BOOKING_PAYMENT_STATUS_LABELS } from "@/constants/booking-payment-status";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  type InvoiceRowFilter,
  daysRelativeToDue,
  effectiveDueIso,
  isOverdue,
  matchesInvoiceFilter,
  suggestInkassoReview,
} from "@/lib/invoice-row-utils";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  FileText,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function localTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

const FILTER_SPECS: {
  id: InvoiceRowFilter;
  label: string;
  title: string;
}[] = [
  { id: "all", label: "Alle", title: "Alle med restbeløp" },
  { id: "overdue", label: "Forf.", title: "Forfalt (forfall passert)" },
  {
    id: "upcoming",
    label: "Ikke forf.",
    title: "Forfall i dag eller fremover",
  },
  { id: "partial", label: "Delv.", title: "Noe innbetalt, rest igjen" },
  { id: "unpaid", label: "Ubet.", title: "Ingen innbetaling registrert" },
];

const invoicesTableHeadClass =
  "px-4 py-3 text-[11px] font-semibold tracking-wider text-rn-text-column uppercase md:px-6 md:py-4 md:text-sm";
const invoicesTableCellClass =
  "px-4 py-4 align-top md:px-6 md:py-5";

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
    <div className="flex flex-col gap-2">
      <div className="tabular-nums text-sm font-semibold text-foreground md:text-base">
        {formatMediumDate(due)}
      </div>
      <div className="text-xs text-muted-foreground md:text-sm">
        {customDue ? "Eget forfall" : "Arr. som referanse"}
      </div>
      {overdue ? (
        <Badge variant="destructive" className="h-6 w-fit rounded-lg px-2 text-[11px] font-bold">
          Forfalt · {relLabel}
        </Badge>
      ) : rel === 0 ? (
        <Badge
          variant="secondary"
          className="h-6 w-fit rounded-lg border border-amber-200 bg-amber-50 px-2 text-[11px] font-bold text-amber-900"
        >
          Forfall i dag
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground md:text-sm">{relLabel}</span>
      )}
      {row.collectionNoticeSentAt ? (
        <Badge
          variant="secondary"
          className="h-auto w-fit max-w-full flex-wrap items-start gap-1 rounded-lg border border-violet-200 bg-violet-50 py-1.5 pl-2 pr-2 text-left text-[11px] font-semibold text-violet-900"
        >
          <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Innkassovarsel registrert {formatNoticeDate(row.collectionNoticeSentAt)}
        </Badge>
      ) : suggestInkasso ? (
        <Badge
          variant="outline"
          className="h-auto w-fit max-w-full items-start gap-1 rounded-lg border-amber-300 bg-amber-50/80 py-1.5 pl-2 pr-2 text-left text-[11px] font-semibold text-amber-950"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-hidden />
          Vurder innkassovarsel (14+ dager over forfall)
        </Badge>
      ) : null}
    </div>
  );
}

function PaymentColumn({ row }: { row: UnpaidInvoiceRow }) {
  const pct = paidSharePct(row);
  const statusLabel = BOOKING_PAYMENT_STATUS_LABELS[row.paymentStatus];

  const badgeClass = (() => {
    switch (row.paymentStatus) {
      case "paid":
        return "rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-950";
      case "unpaid":
        return "rounded-lg border border-border text-[11px] font-bold";
      case "partial":
        return "rounded-lg border border-amber-200 bg-amber-50 text-[11px] font-bold text-amber-950";
      case "waived":
        return "rounded-lg border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-800";
      case "disputed":
        return "rounded-lg border border-orange-300 bg-orange-50 text-[11px] font-bold text-orange-950";
      case "other":
      default:
        return "rounded-lg border border-violet-200 bg-violet-50 text-[11px] font-bold text-violet-950";
    }
  })();

  const unpaid = row.paidNok <= 0;

  return (
    <div className="flex min-w-[8rem] flex-col gap-2">
      <div className="flex flex-col items-start gap-1">
        <Badge variant="outline" className={cn("h-auto px-2 py-1", badgeClass)}>
          {statusLabel}
        </Badge>
        {row.paymentStatus === "partial" ? (
          <span className="text-[11px] font-semibold text-muted-foreground">
            {pct}% av total
          </span>
        ) : null}
      </div>
      <div className="text-sm tabular-nums text-foreground md:text-base">
        <span className="font-semibold text-success">{formatNok(row.paidNok)}</span>
        <span className="text-muted-foreground"> av </span>
        <span>{formatNok(row.totalNok)}</span>
      </div>
      <div
        className="h-2 w-full max-w-[11rem] overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Betalt ${pct} prosent`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            unpaid ? "bg-muted-foreground/25" : "bg-success",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export type InvoicesWorkspaceProps = {
  rows: UnpaidInvoiceRow[];
};

export function InvoicesWorkspace({ rows }: InvoicesWorkspaceProps) {
  const todayYmd = useMemo(() => localTodayYmd(), []);
  const [filter, setFilter] = useState<InvoiceRowFilter>("all");

  const stats = useMemo(() => {
    const overdue = rows.filter((r) => isOverdue(r, todayYmd)).length;
    const partial = rows.filter((r) => r.paymentStatus === "partial").length;
    const unpaid = rows.filter((r) => r.paymentStatus === "unpaid").length;
    const inkassoReg = rows.filter((r) => r.collectionNoticeSentAt).length;
    return { overdue, partial, unpaid, inkassoReg, total: rows.length };
  }, [rows, todayYmd]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => matchesInvoiceFilter(r, filter, todayYmd)),
    [rows, filter, todayYmd],
  );

  if (rows.length === 0) {
    return (
      <section className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center md:gap-5 md:px-8 md:py-20">
          <div
            className="flex size-16 items-center justify-center rounded-2xl border-2 border-rn-border-strong bg-muted/40 md:size-18"
            aria-hidden
          >
            <FileText className="size-8 text-muted-foreground md:size-9" />
          </div>
          <p className="max-w-md text-base text-muted-foreground md:text-lg">
            Ingen utestående fakturaer. Når en booking har restbeløp, vises den
            her med betalingsstatus, forfall og verktøy for oppfølging.
          </p>
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 rounded-xl border-2 border-rn-border-strong px-6 font-heading text-base font-bold",
            )}
          >
            Gå til bookinger
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "flex flex-col gap-4 p-5 md:gap-5 md:p-6",
          RN_CARD_SHELL,
        )}
      >
        <div
          className="flex flex-wrap items-baseline gap-x-1 gap-y-2 md:gap-x-2"
          aria-label="Tall for utestående fakturaer"
        >
          <span
            className="inline-flex items-center gap-2 tabular-nums"
            title="Antall utestående fakturaer"
          >
            <CalendarClock
              className="size-5 shrink-0 text-primary md:size-6"
              aria-hidden
            />
            <span className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {stats.total}
            </span>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground md:text-base">
              TOT
            </span>
          </span>
          {stats.overdue > 0 ? (
            <>
              <span
                className="px-1 text-xl font-light text-muted-foreground/60 md:text-2xl"
                aria-hidden
              >
                ·
              </span>
              <span
                className="inline-flex items-baseline gap-1.5 tabular-nums text-red-900"
                title="Forfalt"
              >
                <span className="text-2xl font-extrabold md:text-3xl">
                  {stats.overdue}
                </span>
                <span className="text-sm font-semibold tracking-wide md:text-base">
                  FORF.
                </span>
              </span>
            </>
          ) : null}
          {stats.partial > 0 ? (
            <>
              <span
                className="px-1 text-xl font-light text-muted-foreground/60 md:text-2xl"
                aria-hidden
              >
                ·
              </span>
              <span
                className="inline-flex items-baseline gap-1.5 tabular-nums text-amber-950"
                title="Delvis betalt"
              >
                <span className="text-2xl font-extrabold md:text-3xl">
                  {stats.partial}
                </span>
                <span className="text-sm font-semibold tracking-wide md:text-base">
                  DELV.
                </span>
              </span>
            </>
          ) : null}
          {stats.unpaid > 0 ? (
            <>
              <span
                className="px-1 text-xl font-light text-muted-foreground/60 md:text-2xl"
                aria-hidden
              >
                ·
              </span>
              <span
                className="inline-flex items-baseline gap-1.5 tabular-nums text-foreground"
                title="Uten innbetaling"
              >
                <span className="text-2xl font-extrabold md:text-3xl">
                  {stats.unpaid}
                </span>
                <span className="text-sm font-semibold tracking-wide text-muted-foreground md:text-base">
                  UBET.
                </span>
              </span>
            </>
          ) : null}
          {stats.inkassoReg > 0 ? (
            <>
              <span
                className="px-1 text-xl font-light text-muted-foreground/60 md:text-2xl"
                aria-hidden
              >
                ·
              </span>
              <span
                className="inline-flex items-center gap-2 tabular-nums text-violet-900"
                title="Innkassovarsel registrert"
              >
                <Scale
                  className="size-5 shrink-0 md:size-6"
                  aria-hidden
                />
                <span className="text-2xl font-extrabold md:text-3xl">
                  {stats.inkassoReg}
                </span>
                <span className="text-sm font-semibold tracking-wide md:text-base">
                  INK.
                </span>
              </span>
            </>
          ) : null}
        </div>

        <div className="border-t border-rn-border-strong/35 pt-4 md:pt-5">
          <div
            role="tablist"
            aria-label="Filtrer fakturaer"
            className="flex flex-wrap gap-2 md:gap-3"
          >
            {FILTER_SPECS.map((spec) => {
              const active = filter === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  role="tab"
                  title={spec.title}
                  aria-selected={active}
                  onClick={() => setFilter(spec.id)}
                  className={cn(
                    "min-h-12 shrink-0 rounded-2xl border-2 px-5 py-3 text-base font-bold tracking-tight transition-colors md:min-h-14 md:px-7 md:py-3.5 md:text-lg",
                    active
                      ? "border-success bg-success/15 text-rn-text-heading shadow-sm"
                      : "border-rn-border-strong bg-card text-muted-foreground hover:border-rn-border-strong/80 hover:bg-muted/40",
                  )}
                >
                  {spec.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className={cn("overflow-hidden", RN_CARD_SHELL)}>
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center text-muted-foreground md:py-16">
            Ingen rader i dette filteret.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-rn-border-strong/50 bg-rn-surface-table-head">
                  <th className={invoicesTableHeadClass}>Kunde</th>
                  <th
                    className={cn(
                      invoicesTableHeadClass,
                      "hidden lg:table-cell",
                    )}
                  >
                    Arrangement
                  </th>
                  <th className={invoicesTableHeadClass}>Betalt</th>
                  <th className={invoicesTableHeadClass}>Forfall / varsler</th>
                  <th
                    className={cn(
                      invoicesTableHeadClass,
                      "hidden text-right md:table-cell",
                    )}
                  >
                    Restbeløp
                  </th>
                  <th
                    className={cn(
                      "w-[1%] whitespace-nowrap text-right",
                      invoicesTableHeadClass,
                    )}
                  >
                    <span className="sr-only">Faktura</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-rn-border-strong/40 transition-colors hover:bg-rn-surface-row-hover"
                  >
                    <td className={invoicesTableCellClass}>
                      <div className="text-base font-semibold text-foreground md:text-lg">
                        {r.customerName}
                      </div>
                      {r.customerEmail ? (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {r.customerEmail}
                        </div>
                      ) : null}
                      <div className="mt-2 text-sm text-muted-foreground lg:hidden">
                        {r.eventType} · {r.eventDateLabel}
                      </div>
                      <div className="mt-2 text-base font-bold tabular-nums text-destructive md:hidden">
                        {formatNok(r.remainingNok)}
                      </div>
                    </td>
                    <td
                      className={cn(
                        invoicesTableCellClass,
                        "hidden text-sm text-muted-foreground lg:table-cell lg:text-base",
                      )}
                    >
                      <div className="font-semibold text-foreground">
                        {r.eventType}
                      </div>
                      <div className="tabular-nums">{r.eventDateLabel}</div>
                      {r.propertyName ? (
                        <div className="mt-1 text-xs">{r.propertyName}</div>
                      ) : null}
                      {r.bookingReference ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Ref: {r.bookingReference}
                        </div>
                      ) : null}
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
                      <span className="text-lg font-bold tabular-nums text-destructive">
                        {formatNok(r.remainingNok)}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        totalt {formatNok(r.totalNok)}
                      </div>
                    </td>
                    <td className={cn(invoicesTableCellClass, "text-right")}>
                      <Link
                        href={`/app/invoices/print/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "inline-flex h-11 items-center gap-2 rounded-xl border-2 border-rn-border-strong px-4 font-heading text-sm font-bold md:h-12 md:px-5 md:text-base",
                        )}
                      >
                        Faktura
                        <ExternalLink className="size-4 shrink-0 opacity-70" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
