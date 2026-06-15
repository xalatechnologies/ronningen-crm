"use client";

import type { DashboardHomeData } from "@/components/dashboard/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  chartBarFillClass,
  chartEmptyBarClass,
} from "@/lib/charts/chart-theme";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BellDot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Kortere etikett over stolper (unngår overflow i smale kolonner). */
function formatNokChartAxis(n: number) {
  if (n === 0) return "0 kr";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(".", ",");
    return `${s} mill.`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    const s =
      k >= 100
        ? k.toFixed(0)
        : k >= 10
          ? k.toFixed(0)
          : k.toFixed(1).replace(".", ",");
    return `${s} k`;
  }
  return formatNok(n);
}

function dashboardEventPillClass(eventType: string) {
  const t = eventType.toLowerCase();
  if (t.includes("bryllup") || t.includes("wedding")) {
    return "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (t.includes("bedrift") || t.includes("corporate")) {
    return "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200";
  }
  if (t.includes("privat") || t.includes("private")) {
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  }
  return "bg-muted text-muted-foreground";
}

function DashboardUpcomingStatusBadge({
  status,
}: {
  status: "confirmed" | "pending" | "cancelled";
}) {
  const pill =
    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase md:px-3 md:py-1.5 md:text-xs";
  if (status === "confirmed") {
    return (
      <span className={cn(pill, "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200")}>
        Bekreftet
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={cn(pill, "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200")}>
        Avventer
      </span>
    );
  }
  return (
    <span className={cn(pill, "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200")}>
      Avbestilt
    </span>
  );
}

const tableHeadClass =
  "px-6 py-4 text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 md:px-8 md:py-6";

const NB_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

function formatPctDelta(p: number | null) {
  if (p == null) return "Ingen sammenligning med forrige måned";
  const rounded = Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1);
  const sign = p > 0 ? "+" : "";
  return `${sign}${rounded} % mot forrige måned (fakturert, arrangementsdato)`;
}

export function DashboardHome({ data }: { data: DashboardHomeData }) {
  const chartYearOptions = useMemo(() => {
    const fromData = data.monthlyByYear.map((s) => s.year);
    if (fromData.length > 0) return fromData;
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y];
  }, [data.monthlyByYear]);

  const [chartYear, setChartYear] = useState(() => {
    const y = new Date().getFullYear();
    return chartYearOptions.includes(y) ? y : chartYearOptions[chartYearOptions.length - 1] ?? y;
  });

  const chartMonthAmounts = useMemo(() => {
    const hit = data.monthlyByYear.find((s) => s.year === chartYear);
    if (hit) return [...hit.months];
    return Array.from({ length: 12 }, () => 0);
  }, [data.monthlyByYear, chartYear]);

  const chartBars = useMemo(() => {
    const max = Math.max(0, ...chartMonthAmounts);
    const scaleMax = max > 0 ? max : 1;
    const now = new Date();
    const highlightMonth =
      chartYear === now.getFullYear() ? now.getMonth() : -1;
    return chartMonthAmounts.map((amount, i) => {
      const rawPct = (amount / scaleMax) * 100;
      const hasValue = amount > 0;
      const heightPct = hasValue ? Math.max(14, rawPct) : 0;
      return {
        key: `m-${i}`,
        label: NB_MONTH_SHORT[i] ?? "",
        amount,
        hasValue,
        heightPct,
        highlight: i === highlightMonth,
      };
    });
  }, [chartMonthAmounts, chartYear]);

  const { kpis } = data;
  const paidShareLabel =
    kpis.paidShareOfInvoicedPct != null
      ? `${Math.round(kpis.paidShareOfInvoicedPct)} % av fakturert`
      : "—";

  const overdueLabel =
    kpis.overdueUnpaidCount === 0
      ? "Ingen forfalte ubetalte bookinger"
      : `${kpis.overdueUnpaidCount} booking${kpis.overdueUnpaidCount !== 1 ? "er" : ""} med restanse etter arrangementsdato`;

  const venuesLabel =
    kpis.propertyCount === 0
      ? "Registrer lokaler under Inventar"
      : `${kpis.propertyCount} lokal${kpis.propertyCount !== 1 ? "er" : ""} i systemet`;

  const kpiTileClass =
    "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

  return (
    <div className="mx-auto flex w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            title="Oversikt"
          />
        </div>
        {data.loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:text-base">
              Noe gikk galt ved lasting: {data.loadError}
            </div>
          </div>
        ) : null}
        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="dashboard-kpi-label">Totalt fakturert</span>
                <div className="rounded-md bg-accent p-2 dark:bg-white/10">
                  <LayoutDashboard className="size-6 text-primary dark:text-white" aria-hidden />
                </div>
              </div>
              <div>
                <p className="dashboard-kpi-value text-success">
                  {formatNok(kpis.totalInvoicedNok)}
                </p>
                <p className="dashboard-kpi-caption mt-3 text-muted-foreground">
                  {formatPctDelta(kpis.invoicedMonthDeltaPct)}
                </p>
              </div>
            </div>

            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="dashboard-kpi-label">Betalt</span>
                <div className="rounded-md bg-accent p-2 dark:bg-white/10">
                  <CheckCircle2 className="size-6 text-primary dark:text-white" aria-hidden />
                </div>
              </div>
              <div>
                <p className="dashboard-kpi-value text-success">
                  {formatNok(kpis.totalPaidNok)}
                </p>
                <p className="dashboard-kpi-caption mt-3 text-muted-foreground">
                  {paidShareLabel}
                </p>
              </div>
            </div>

            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="dashboard-kpi-label">Ubetalt</span>
                <div className="rounded-md bg-rn-danger-soft p-2">
                  <Clock className="size-6 text-rn-danger-ink" aria-hidden />
                </div>
              </div>
              <div>
                <p className="dashboard-kpi-value text-destructive">
                  {formatNok(kpis.totalUnpaidNok)}
                </p>
                <p className="dashboard-kpi-caption mt-3 flex items-center gap-1 text-destructive">
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                  {overdueLabel}
                </p>
              </div>
            </div>

            <div className={kpiTileClass}>
              <div className="mb-3 flex items-start justify-between">
                <span className="dashboard-kpi-label">Bookinger</span>
                <div className="rounded-md bg-accent p-2 dark:bg-white/10">
                  <CalendarCheck className="size-6 text-primary dark:text-white" aria-hidden />
                </div>
              </div>
              <div>
                <p className="dashboard-kpi-value text-success">
                  {kpis.activeBookingCount}
                </p>
                <p className="dashboard-kpi-caption mt-3 text-muted-foreground">
                  {venuesLabel}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className={cn("lg:col-span-2 overflow-hidden", RN_CARD_SHELL)}>
          <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-8 md:py-6">
            <div>
              <h2 className="app-section-title">
                Månedlig omsetning
              </h2>
              <p className="mt-1 app-text-muted md:text-app-sm">
                Fakturert beløp per måned etter arrangementsdato (aktive bookinger)
              </p>
            </div>
            <Select
              value={String(chartYear)}
              onValueChange={(v) => setChartYear(Number(v))}
            >
              <SelectTrigger
                aria-label="Velg år for diagrammet"
                className={cn(
                  "h-12 min-w-[8.5rem] rounded-md border-2 border-rn-border-strong bg-rn-surface-segment px-4 font-heading text-base font-semibold shadow-rn-segment-inset",
                  "focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 data-popup-open:border-rn-accent-border",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--anchor-width)]">
                {chartYearOptions.map((y) => (
                  <SelectItem
                    key={y}
                    value={String(y)}
                    className="py-2.5 font-heading text-base font-semibold tabular-nums"
                  >
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t border-rn-border-strong/35 px-3 py-4 md:px-5 md:py-5">
            <div
              className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"
              aria-hidden
            >
              <span className="text-xs font-semibold text-foreground md:text-sm">
                Fakturert per måned · {chartYear}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground md:text-xs">
                Høyeste: {formatNok(Math.max(...chartMonthAmounts, 0))}
              </span>
            </div>
            <div
              className="flex h-[min(20rem,calc(100vw-4rem))] min-h-[13.5rem] w-full items-stretch gap-0.5 sm:gap-1 md:gap-1.5"
              role="img"
              aria-label={`Stolpediagram for fakturert omsetning per arrangementsmåned i ${chartYear}. Beløp vises over hver stolpe.`}
            >
              {chartBars.map((bar) => (
                <div
                  key={bar.key}
                  className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-end"
                >
                  <div className="flex min-h-0 flex-1 flex-col justify-end gap-1">
                    <span
                      className={cn(
                        "line-clamp-2 min-h-8 px-px text-center text-[9px] font-semibold leading-tight tracking-tight tabular-nums sm:text-[10px] md:min-h-0 md:text-[11px]",
                        bar.hasValue
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                      title={`${bar.label}: ${formatNok(bar.amount)}`}
                    >
                      {formatNokChartAxis(bar.amount)}
                    </span>
                    <div className="relative flex min-h-[7rem] flex-1 flex-col justify-end border-b-2 border-rn-border-strong/55 sm:min-h-[8.5rem] md:min-h-[10rem]">
                      {bar.hasValue ? (
                        <div
                          className={cn(
                            "w-full min-h-[6px] rounded-t-md transition-colors",
                            chartBarFillClass(bar.highlight),
                          )}
                          style={{ height: `${bar.heightPct}%` }}
                          title={`${bar.label}: ${formatNok(bar.amount)}`}
                        />
                      ) : (
                        <div
                          className={chartEmptyBarClass()}
                          title={`${bar.label}: ${formatNok(bar.amount)}`}
                          aria-hidden
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-2.5 flex w-full justify-between gap-0.5 border-t border-dashed border-rn-border-strong/40 pt-2.5"
              aria-hidden
            >
              {chartBars.map((bar) => (
                <span
                  key={`${bar.key}-axis`}
                  className={cn(
                    "min-w-0 flex-1 select-none text-center text-[9px] font-semibold uppercase leading-none tracking-tight text-muted-foreground sm:text-[10px] md:text-[11px]",
                    bar.highlight && "font-bold text-primary",
                  )}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col rounded-md border-2 border-rn-danger-surface bg-rn-danger-surface/30 p-6 shadow-rn-card md:p-8",
          )}
        >
          <div className="mb-6 flex items-center gap-2 md:mb-8 md:gap-3">
            <BellDot
              className="size-5 shrink-0 text-destructive md:size-6"
              aria-hidden
            />
            <h2 className="app-section-title text-rn-danger-ink">
              Betalingsvarsler
            </h2>
          </div>
          <div className="flex flex-1 flex-col gap-4 md:gap-5">
            {data.paymentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground md:text-base">
                Ingen bookinger med restbeløp der arrangementsdato er passert eller i dag.
              </p>
            ) : (
              data.paymentAlerts.map((a) => (
                <div
                  key={a.bookingId}
                  className="flex flex-col gap-3 rounded-md border-2 border-rn-border-strong/60 bg-card/90 p-4 shadow-sm md:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-base font-semibold text-foreground">
                      {a.title}
                    </span>
                    <span className="shrink-0 text-base font-bold tabular-nums text-destructive">
                      {formatNok(a.amountNok)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground md:text-base">
                    <span>Arrangement: {a.dueLabel}</span>
                    {a.status === "overdue" ? (
                      <span className="inline-flex rounded-full bg-rn-danger-surface px-2.5 py-1 text-[11px] font-bold tracking-wide text-destructive uppercase md:px-3 md:py-1.5 md:text-xs">
                        Forfalt
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-900 uppercase dark:bg-amber-950/40 dark:text-amber-100 md:px-3 md:py-1.5 md:text-xs">
                        I dag
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            href="/app/invoices"
            className={cn(
              buttonVariants({ variant: "success", size: "cta" }),
              "mt-6 w-full",
            )}
          >
            Gå til fakturaer
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <Table>
          <TableHeader>
            <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
              <TableHead className={tableHeadClass}>Dato &amp; tid</TableHead>
              <TableHead className={tableHeadClass}>Kunde</TableHead>
              <TableHead className={tableHeadClass}>Type</TableHead>
              <TableHead className={tableHeadClass}>Lokal</TableHead>
              <TableHead className={tableHeadClass}>Status</TableHead>
              <TableHead className={cn(tableHeadClass, "text-right")}>
                Bookinger
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.upcoming.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-6 py-12 text-center text-base md:py-16"
                >
                  Ingen kommende bookinger i vinduet.{" "}
                  <Link
                    href="/app/bookings"
                    className="font-semibold text-success underline underline-offset-2 dark:!text-white"
                  >
                    Se alle bookinger
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              data.upcoming.map((row) => (
                <TableRow
                  key={row.bookingId}
                  className="border-rn-border-strong/40 hover:bg-rn-surface-row-hover"
                >
                  <TableCell className={cn(tableCellClass, "whitespace-normal")}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold text-foreground">
                        {row.dateLabel}
                      </span>
                      <span className="text-sm md:text-base">
                        {row.timeLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={cn(tableCellClass, "whitespace-normal")}>
                    <div className="flex items-center gap-4">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary dark:bg-rn-surface-segment dark:!text-white md:size-11 md:text-base"
                        aria-hidden
                      >
                        {row.initials}
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        {row.customer}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2.5 py-1 text-xs font-bold md:px-3 md:text-sm",
                        dashboardEventPillClass(row.type),
                      )}
                    >
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      tableCellClass,
                      "whitespace-normal text-base",
                    )}
                  >
                    {row.venue}
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <DashboardUpcomingStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className={cn(tableCellClass, "text-right")}>
                    <Link
                      href="/app/bookings"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-success underline-offset-2 hover:underline dark:!text-white md:text-base"
                    >
                      Liste
                      <ExternalLink className="size-4 shrink-0 opacity-70" aria-hidden />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
