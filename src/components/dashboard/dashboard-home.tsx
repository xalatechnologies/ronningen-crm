"use client";

import type { DashboardHomeData } from "@/components/dashboard/types";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/i18n/client";
import { buildRollingMonths } from "@/lib/dashboard-metrics";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { APP_TABLE_HEAD_CELL } from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUpRight,
  BellDot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

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
  const { t } = useTranslation();
  const pill =
    "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase md:px-3 md:py-1.5 md:text-app-xs";
  const label = statusLabel(status, t);
  if (status === "confirmed") {
    return (
      <span className={cn(pill, "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200")}>
        {label}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={cn(pill, "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200")}>
        {label}
      </span>
    );
  }
  return (
    <span className={cn(pill, "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200")}>
      {label}
    </span>
  );
}

const tableHeadClass = APP_TABLE_HEAD_CELL;
const tableCellClass = "px-6 py-5 md:px-8 md:py-6";

export function DashboardHome({ data }: { data: DashboardHomeData }) {
  const { t, formatCurrency, formatNumber } = useTranslation();

  const monthLabels = useMemo(
    () => MONTH_KEYS.map((key) => t(`dashboard.months.${key}`)),
    [t],
  );

  function formatNokChartAxis(n: number) {
    if (n === 0) return t("dashboard.chartAxisZero");
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(".", ",");
      return t("dashboard.chartAxisMillions", { value: s });
    }
    if (n >= 1000) {
      const k = n / 1000;
      const s =
        k >= 100
          ? k.toFixed(0)
          : k >= 10
            ? k.toFixed(0)
            : k.toFixed(1).replace(".", ",");
      return t("dashboard.chartAxisThousands", { value: s });
    }
    return formatCurrency(n);
  }

  function formatPctDelta(p: number | null) {
    if (p == null) return t("dashboard.noComparison");
    const rounded = Math.abs(p) >= 10 ? p.toFixed(0) : p.toFixed(1);
    const sign = p > 0 ? "+" : "";
    return t("dashboard.percentDelta", { sign, percent: rounded });
  }

  // The chart always shows the last 12 months in a row (crosses year boundaries), so there is no year picker.
  const rollingMonths = useMemo(() => buildRollingMonths(data.monthlyByYear), [data.monthlyByYear]);
  const rangeLabel = useMemo(() => {
    const first = rollingMonths[0];
    const last = rollingMonths[rollingMonths.length - 1];
    if (!first || !last) return "";
    return `${monthLabels[first.month]} ${first.year} – ${monthLabels[last.month]} ${last.year}`;
  }, [rollingMonths, monthLabels]);

  const chartBars = useMemo(() => {
    const max = Math.max(0, ...rollingMonths.map((m) => m.amount));
    const scaleMax = max > 0 ? max : 1;
    return rollingMonths.map((m, i) => {
      const hasValue = m.amount > 0;
      return {
        key: `m-${m.year}-${m.month}`,
        label: monthLabels[m.month] ?? "",
        // Year shown under the first bar and under every January, so the year change is easy to see.
        yearLabel: i === 0 || m.month === 0 ? String(m.year) : "",
        amount: m.amount,
        hasValue,
        heightPct: hasValue ? Math.max(14, (m.amount / scaleMax) * 100) : 0,
        highlight: i === rollingMonths.length - 1,
      };
    });
  }, [rollingMonths, monthLabels]);

  const { kpis } = data;
  const paidShareLabel =
    kpis.paidShareOfInvoicedPct != null
      ? t("dashboard.percentOfInvoiced", {
          percent: Math.round(kpis.paidShareOfInvoicedPct),
        })
      : "—";

  const overdueLabel =
    kpis.overdueUnpaidCount === 0
      ? t("dashboard.noOverdueUnpaid")
      : kpis.overdueUnpaidCount === 1
        ? t("dashboard.overdueBookings", { count: kpis.overdueUnpaidCount })
        : t("dashboard.overdueBookingsPlural", { count: kpis.overdueUnpaidCount });

  const venuesLabel =
    kpis.propertyCount === 0
      ? t("dashboard.registerVenues")
      : kpis.propertyCount === 1
        ? t("dashboard.venuesInSystem", { count: kpis.propertyCount })
        : t("dashboard.venuesInSystemPlural", { count: kpis.propertyCount });

  const tile =
    "flex min-h-44 flex-col justify-between gap-6 rounded-2xl p-6 ring-1 ring-foreground/8";
  const label =
    "text-[13px] font-semibold tracking-wide text-muted-foreground";
  const value =
    "font-heading text-[clamp(28px,2.6vw,40px)] leading-none font-bold tracking-[-0.03em] tabular-nums";
  const card = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

  const deltaUp =
    kpis.invoicedMonthDeltaPct != null && kpis.invoicedMonthDeltaPct >= 0;
  const DeltaIcon = deltaUp ? TrendingUp : TrendingDown;
  const paidPct = Math.min(
    100,
    Math.max(0, Math.round(kpis.paidShareOfInvoicedPct ?? 0)),
  );
  const chartMax = Math.max(0, ...rollingMonths.map((m) => m.amount));

  return (
    <div className="mx-auto flex w-full flex-col gap-6 pb-8 lg:gap-8">
      <AppPageHeader
        className="mb-0"
        surface="default"
        title={t("dashboard.title")}
      />

      {data.loadError ? (
        <div role="alert">
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-app-sm text-destructive md:text-app-base">
            {t("dashboard.loadError", { error: data.loadError })}
          </div>
        </div>
      ) : null}

      <section aria-label={t("dashboard.kpiAria")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cn(tile, "bg-[#3d62cf] text-white ring-0")}>
            <div className="flex items-center justify-between gap-3">
              <span className={cn(label, "text-[#c9d6f7]")}>
                {t("dashboard.totalInvoiced")}
              </span>
              <Wallet className="size-5 text-[#93acff]" aria-hidden />
            </div>
            <div className="flex flex-col gap-3">
              <p className={cn(value, "text-white")}>
                {formatCurrency(kpis.totalInvoicedNok)}
              </p>
              <p className="text-[13px] leading-snug text-[#c9d6f7]">
                {t("dashboard.kpiBookingsScopeAllYears")}
              </p>
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold text-white">
                {kpis.invoicedMonthDeltaPct != null ? (
                  <DeltaIcon className="size-3.5" aria-hidden />
                ) : null}
                {formatPctDelta(kpis.invoicedMonthDeltaPct)}
              </p>
            </div>
          </div>

          <div className={cn(tile, "bg-card")}>
            <div className="flex items-center justify-between gap-3">
              <span className={label}>{t("dashboard.paid")}</span>
              <CheckCircle2 className="size-5 text-success" aria-hidden />
            </div>
            <div className="flex flex-col gap-3">
              <p className={cn(value, "text-foreground")}>
                {formatCurrency(kpis.totalPaidNok)}
              </p>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="text-[13px] leading-snug text-muted-foreground">
                {paidShareLabel}
              </p>
            </div>
          </div>

          <div className={cn(tile, "bg-rn-danger-surface/35")}>
            <div className="flex items-center justify-between gap-3">
              <span className={label}>{t("dashboard.unpaid")}</span>
              <Clock className="size-5 text-destructive" aria-hidden />
            </div>
            <div className="flex flex-col gap-3">
              <p className={cn(value, "text-destructive")}>
                {formatCurrency(kpis.totalUnpaidNok)}
              </p>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[13px] leading-snug",
                  kpis.overdueUnpaidCount > 0
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {kpis.overdueUnpaidCount > 0 ? (
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                ) : null}
                {overdueLabel}
              </p>
            </div>
          </div>

          <div className={cn(tile, "bg-card")}>
            <div className="flex items-center justify-between gap-3">
              <span className={label}>{t("dashboard.bookings")}</span>
              <CalendarCheck className="size-5 text-success" aria-hidden />
            </div>
            <div className="flex flex-col gap-3">
              <p className={cn(value, "text-foreground")}>
                {formatNumber(kpis.activeBookingCount)}
              </p>
              <p className="text-[13px] leading-snug text-muted-foreground">
                {venuesLabel}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className={cn("lg:col-span-2", card)}>
          <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:px-8 md:pt-7">
            <div>
              <h2 className="app-section-title">
                {t("dashboard.monthlyRevenue")}
              </h2>
              <p className="mt-1 app-text-muted md:text-app-sm">
                {t("dashboard.revenueSubtitle")}
              </p>
            </div>
          </div>

          <div className="px-4 pt-5 pb-6 md:px-8 md:pb-8">
            <div
              className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"
              aria-hidden
            >
              <span className="text-app-sm font-semibold text-foreground">
                {t("dashboard.revenuePerMonth", { range: rangeLabel })}
              </span>
              <span className="text-app-xs tabular-nums text-muted-foreground">
                {t("dashboard.highest", {
                  amount: formatCurrency(chartMax),
                })}
              </span>
            </div>
            <div
              className="flex h-64 w-full items-stretch gap-1.5 md:h-72 md:gap-2.5"
              role="img"
              aria-label={t("dashboard.chartAria", { range: rangeLabel })}
            >
              {chartBars.map((bar) => (
                <div
                  key={bar.key}
                  className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
                  title={`${bar.label}: ${formatCurrency(bar.amount)}`}
                >
                  <span
                    className={cn(
                      "min-h-4 text-center text-[10px] leading-none font-semibold tabular-nums md:text-[11px]",
                      bar.highlight
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                      !bar.hasValue && "invisible",
                    )}
                  >
                    {formatNokChartAxis(bar.amount)}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col justify-end">
                    {bar.hasValue ? (
                      <div
                        className={cn(
                          "w-full min-h-1.5 rounded-t-lg transition-colors",
                          bar.highlight
                            ? "bg-success"
                            : "bg-emerald-500/30 group-hover:bg-emerald-500/55",
                        )}
                        style={{ height: `${bar.heightPct}%` }}
                      />
                    ) : (
                      <div
                        className="h-1 w-full rounded-full bg-muted"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex w-full gap-1.5 md:gap-2.5" aria-hidden>
              {chartBars.map((bar) => (
                <span
                  key={`${bar.key}-axis`}
                  className={cn(
                    "min-w-0 flex-1 text-center text-[10px] font-medium uppercase select-none md:text-[11px]",
                    bar.highlight
                      ? "font-bold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {bar.label}
                  {bar.yearLabel ? <span className="block text-[9px] font-normal tabular-nums normal-case opacity-70 md:text-[10px]">{bar.yearLabel}</span> : null}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("flex flex-col p-6 md:p-8", card)}>
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-rn-danger-surface/50 text-destructive">
              <BellDot className="size-4" aria-hidden />
            </span>
            <h2 className="app-section-title">
              {t("dashboard.paymentAlerts")}
            </h2>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {data.paymentAlerts.length === 0 ? (
              <p className="rounded-xl bg-muted/60 px-4 py-5 text-app-sm text-muted-foreground md:text-app-base">
                {t("dashboard.noPaymentAlerts")}
              </p>
            ) : (
              data.paymentAlerts.map((a) => (
                <div
                  key={a.bookingId}
                  className="flex flex-col gap-2.5 rounded-xl bg-muted/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-app-base font-semibold text-foreground">
                      {a.title}
                    </span>
                    <span className="shrink-0 text-app-base font-bold tabular-nums text-destructive">
                      {formatCurrency(a.amountNok)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-app-sm text-muted-foreground">
                    <span>{t("dashboard.event", { label: a.dueLabel })}</span>
                    {a.status === "overdue" ? (
                      <span className="inline-flex rounded-full bg-rn-danger-surface/70 px-2.5 py-1 text-[11px] font-bold tracking-wide text-rn-danger-ink uppercase">
                        {t("dashboard.overdue")}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-900 uppercase dark:bg-amber-950/40 dark:text-amber-100">
                        {t("dashboard.today")}
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
              "mt-6 w-full rounded-xl shadow-none",
            )}
          >
            {t("dashboard.goToInvoices")}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className={card}>
        <Table>
          <TableHeader>
            <TableRow className="border-0 bg-muted/60 hover:bg-muted/60">
              <TableHead className={tableHeadClass}>{t("dashboard.tableDateTime")}</TableHead>
              <TableHead className={tableHeadClass}>{t("dashboard.tableCustomer")}</TableHead>
              <TableHead className={tableHeadClass}>{t("dashboard.tableType")}</TableHead>
              <TableHead className={tableHeadClass}>{t("dashboard.tableVenue")}</TableHead>
              <TableHead className={tableHeadClass}>{t("dashboard.tableStatus")}</TableHead>
              <TableHead className={cn(tableHeadClass, "text-right")}>
                {t("dashboard.tableBookings")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.upcoming.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-6 py-12 text-center text-app-base md:py-16"
                >
                  {t("dashboard.noUpcoming")}{" "}
                  <Link
                    href="/app/bookings"
                    className="font-semibold text-success underline underline-offset-2 dark:!text-white"
                  >
                    {t("dashboard.viewAllBookings")}
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              data.upcoming.map((row) => (
                <TableRow
                  key={row.bookingId}
                  className="border-foreground/6 hover:bg-muted/50"
                >
                  <TableCell className={cn(tableCellClass, "whitespace-normal")}>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-app-base font-semibold text-foreground">
                        {row.dateLabel}
                      </span>
                      <span className="text-app-sm text-muted-foreground">
                        {row.timeLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={cn(tableCellClass, "whitespace-normal")}>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-app-sm font-semibold text-primary dark:bg-rn-surface-segment dark:!text-white"
                        aria-hidden
                      >
                        {row.initials}
                      </div>
                      <span className="text-app-base font-semibold text-foreground">
                        {row.customer}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={tableCellClass}>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-app-xs font-semibold",
                        dashboardEventPillClass(row.type),
                      )}
                    >
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      tableCellClass,
                      "whitespace-normal text-app-base",
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
                      className="inline-flex items-center gap-1 text-app-sm font-semibold text-success underline-offset-2 hover:underline dark:!text-white md:text-app-base"
                    >
                      {t("dashboard.listLink")}
                      <ArrowUpRight className="size-4 shrink-0 opacity-70" aria-hidden />
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
