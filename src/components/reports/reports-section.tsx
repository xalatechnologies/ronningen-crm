import { buttonVariants } from "@/components/ui/button";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import type { EventTypeBreakdown, ReportsSectionProps } from "./types";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatReportDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function eventPillClass(eventType: string) {
  const t = eventType.toLowerCase();
  if (t.includes("bryllup") || t.includes("wedding")) {
    return "bg-emerald-50 text-emerald-900";
  }
  if (t.includes("bedrift") || t.includes("corporate")) {
    return "bg-blue-50 text-blue-900";
  }
  if (t.includes("privat") || t.includes("private")) {
    return "bg-amber-50 text-amber-900";
  }
  return "bg-muted text-muted-foreground";
}

const BAR_BG = [
  "bg-emerald-100",
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-emerald-300",
  "bg-success",
] as const;

function eventBarClass(i: number) {
  return BAR_BG[i % BAR_BG.length]!;
}

function UpcomingStatusBadge({
  status,
}: {
  status: "confirmed" | "pending" | "cancelled";
}) {
  const pill =
    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase md:px-3 md:py-1.5 md:text-xs";
  if (status === "confirmed") {
    return (
      <span className={cn(pill, "bg-emerald-50 text-emerald-900")}>
        Bekreftet
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={cn(pill, "bg-amber-50 text-amber-900")}>
        Avventer
      </span>
    );
  }
  return (
    <span className={cn(pill, "bg-red-50 text-red-800")}>
      Avbestilt
    </span>
  );
}

function BreakdownRow({
  row,
  index,
}: {
  row: EventTypeBreakdown;
  index: number;
}) {
  return (
    <div className="relative pt-2">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span
          className={cn(
            "inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-bold tracking-wide uppercase md:px-4 md:py-2 md:text-base",
            eventPillClass(row.eventType),
          )}
        >
          {row.eventType}
        </span>
        <span className="text-left text-base font-bold tabular-nums sm:text-right md:text-lg">
          <span className="text-foreground">{row.count}</span>
          <span className="font-semibold text-muted-foreground">
            {" "}
            {row.count === 1 ? "booking" : "bookinger"} · {row.pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 md:h-4">
        <div
          className={cn(
            "flex flex-col justify-center whitespace-nowrap text-center text-white shadow-none transition-[width]",
            eventBarClass(index),
          )}
          style={{
            width:
              row.count === 0
                ? "0%"
                : `${Math.min(100, Math.max(row.pct, 6))}%`,
          }}
        />
      </div>
    </div>
  );
}

export function ReportsSection({
  kpis,
  monthlyRevenue,
  eventBreakdown,
  upcoming,
  reportYear,
  loadError,
}: ReportsSectionProps) {
  const paddedCard = (extra?: string) =>
    cn("rounded-2xl p-6", RN_CARD_SHELL, extra);
  const flushCard = (extra?: string) =>
    cn("overflow-hidden", RN_CARD_SHELL, extra);

  const maxMonthlyAmount =
    monthlyRevenue.length > 0
      ? Math.max(0, ...monthlyRevenue.map((m) => m.amount))
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-24 md:pb-8">
      <AppPageHeader
        title="Rapporter"
        description="Oversikt over omsetning, bookinger og kommende arrangementer — samlet for beslutningsstøtte."
      />

      {loadError ? (
        <div
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Kunne ikke laste data: {loadError}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        <div className={paddedCard()}>
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Omsetning
          </p>
          <p className="font-heading text-3xl font-extrabold tracking-tight text-success tabular-nums sm:text-4xl">
            {formatNok(kpis.revenueYtd)}
          </p>
          {kpis.revenueTrendPct != null ? (
            <div
              className={cn(
                "mt-3 flex items-center gap-1 text-xs font-bold",
                kpis.revenueTrendPct >= 0 ? "text-emerald-600" : "text-destructive",
              )}
            >
              {kpis.revenueTrendPct >= 0 ? (
                <TrendingUp className="size-4 shrink-0" aria-hidden />
              ) : (
                <TrendingDown className="size-4 shrink-0" aria-hidden />
              )}
              <span>
                {kpis.revenueTrendPct >= 0 ? "+" : ""}
                {kpis.revenueTrendPct.toFixed(1).replace(".", ",")} % vs. fjorår*
              </span>
            </div>
          ) : null}
        </div>

        <div className={paddedCard()}>
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Innbetalt
          </p>
          <p className="font-heading text-3xl font-extrabold tracking-tight text-success tabular-nums sm:text-4xl">
            {formatNok(kpis.totalPaid)}
          </p>
          <div className="mt-4 h-1.5 w-full rounded-full border border-rn-border-strong/30 bg-muted/40">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${Math.min(100, Math.round(kpis.paidShare * 100))}%` }}
            />
          </div>
        </div>

        <div className={paddedCard()}>
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Ubetalt
          </p>
          <p className="font-heading text-3xl font-extrabold tracking-tight text-destructive tabular-nums sm:text-4xl">
            {formatNok(kpis.totalUnpaid)}
          </p>
          {kpis.totalBooked > 0 ? (
            <p className="mt-3 text-xs font-medium tabular-nums text-muted-foreground">
              {(kpis.unpaidShareOfBooked * 100).toFixed(1).replace(".", ",")} % av
              fakturert
            </p>
          ) : null}
          {kpis.totalUnpaid > 0 ? (
            <Link
              href="/app/invoices"
              className="mt-2 inline-flex text-xs font-semibold text-success underline-offset-2 hover:underline"
            >
              Faktura →
            </Link>
          ) : null}
        </div>

        <div className={paddedCard()}>
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Bookinger
          </p>
          <p className="font-heading text-3xl font-extrabold tracking-tight text-success tabular-nums sm:text-4xl">
            {kpis.bookingCount}
          </p>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            <span className="text-emerald-600">
              {kpis.confirmedBookingCount} bekreftet
            </span>
            {" · "}
            <span className="text-amber-700 dark:text-amber-400">
              {kpis.pendingBookingCount} venter
            </span>
          </p>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className={paddedCard("lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Omsetning per måned
            </h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-[12px] font-semibold tracking-wide text-secondary-foreground uppercase">
              {reportYear} hittil i år
            </span>
          </div>
          <div className="flex h-48 items-end justify-between gap-1.5 px-1 sm:gap-2">
            {monthlyRevenue.map((m) => {
              const barPct =
                maxMonthlyAmount > 0 && m.amount > 0
                  ? Math.max(8, (m.amount / maxMonthlyAmount) * 100)
                  : 0;
              const hasValue = m.amount > 0;
              return (
                <div
                  key={m.monthIndex}
                  className="group relative flex h-full min-w-0 flex-1 flex-col items-stretch justify-end"
                >
                  <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-rn-accent-border bg-success px-2 py-0.5 text-[10px] whitespace-nowrap text-primary-foreground shadow-md group-hover:block">
                    {formatNok(m.amount)}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-colors",
                      hasValue
                        ? "min-h-[4px] bg-emerald-500/90 group-hover:bg-emerald-600"
                        : "h-1 shrink-0 rounded-sm bg-muted/50",
                    )}
                    style={
                      hasValue && barPct > 0
                        ? { height: `${barPct}%` }
                        : undefined
                    }
                    title={`${m.label}: ${formatNok(m.amount)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
            {monthlyRevenue.map((m) => (
              <span key={m.monthIndex}>{m.label}</span>
            ))}
          </div>
        </section>

        <section className={paddedCard("p-7 md:p-8")}>
          <h2 className="mb-8 font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Privat og bedrift
          </h2>
          {kpis.bookingCount === 0 ? (
            <p className="text-base text-muted-foreground">
              Ingen aktive bookinger å vise.
            </p>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {eventBreakdown.map((row, i) => (
                <BreakdownRow key={row.eventType} row={row} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={flushCard()}>
        <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8 md:py-6">
          <h2 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
            Kommende bookinger
          </h2>
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "h-12 gap-1.5 self-start rounded-xl px-4 text-base font-bold text-success hover:bg-rn-surface-row-hover hover:text-success sm:self-auto md:h-14 md:px-5 md:text-[17px]",
            )}
          >
            Se alle
            <ChevronRight className="size-5 md:size-6" aria-hidden />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-6 py-14 text-center text-base text-muted-foreground md:py-16 md:text-lg">
            Ingen kommende bookinger funnet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                <TableHead className="px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base">
                  Kunde
                </TableHead>
                <TableHead className="px-6 py-4 text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base">
                  Dato
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5 md:text-base">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-rn-border-strong/40 hover:bg-rn-surface-row-hover"
                >
                  <TableCell className="px-6 py-5 md:px-8 md:py-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary md:size-11 md:text-base"
                        aria-hidden
                      >
                        {row.initials}
                      </div>
                      <span className="text-base font-semibold text-foreground md:text-lg">
                        {row.customerName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-5 text-base text-muted-foreground md:px-8 md:py-6 md:text-lg">
                    {formatReportDate(row.eventDate)}
                  </TableCell>
                  <TableCell className="px-6 py-5 text-right md:px-8 md:py-6">
                    <UpcomingStatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        *Sammenligning: tilsvarende periode i fjor. Avbestilt ekskludert.
        Omsetning = inntekter i Finans + innbetalt på bookinger etter
        arrangementsdato (kan overlappe).{" "}
        <Link href="/app/finance" className="font-medium text-success hover:underline">
          Finans
        </Link>
        {" · "}
        <Link href="/app/bookings" className="font-medium text-success hover:underline">
          Bookinger
        </Link>
      </p>
    </div>
  );
}
