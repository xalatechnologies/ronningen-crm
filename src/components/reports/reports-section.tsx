import { AppPageHeader } from "@/components/layout/app-page-header";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ReportsYearMonthCalendar } from "./reports-year-month-calendar";
import type { EventTypeBreakdown, FestTypeBreakdown, ReportsSectionProps } from "./types";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
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

function FestTypeBreakdownRow({
  row,
  index,
}: {
  row: FestTypeBreakdown;
  index: number;
}) {
  return (
    <div className="relative pt-2">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span
          className={cn(
            "reports-breakdown-pill inline-flex w-fit rounded-full px-3 py-1.5 font-bold tracking-wide md:px-4 md:py-2",
            eventPillClass(row.festType),
          )}
        >
          {row.festType}
        </span>
        <span className="reports-breakdown-stats text-left sm:text-right">
          <span className="text-foreground">{row.count}</span>
          <span className="reports-breakdown-stats-meta text-muted-foreground">
            {" "}
            {row.count === 1 ? "booking" : "bookinger"} · {row.pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted md:h-4">
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
            "reports-breakdown-pill inline-flex w-fit rounded-full px-3 py-1.5 font-bold tracking-wide uppercase md:px-4 md:py-2",
            eventPillClass(row.eventType),
          )}
        >
          {row.eventType}
        </span>
        <span className="reports-breakdown-stats text-left sm:text-right">
          <span className="text-foreground">{row.count}</span>
          <span className="reports-breakdown-stats-meta text-muted-foreground">
            {" "}
            {row.count === 1 ? "booking" : "bookinger"} · {row.pct.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted md:h-4">
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
  festTypeBreakdown,
  facility,
  reportYear,
  calendarYearMax,
  focusMonth,
  reportsPeriodLabel,
  loadError,
  hasRegisteredActivity,
}: ReportsSectionProps) {
  const paddedCard = (extra?: string) =>
    cn("p-6", RN_CARD_SHELL, extra);

  const kpiTileClass =
    "flex flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-6 shadow-sm";

  const maxMonthlyAmount =
    monthlyRevenue.length > 0
      ? Math.max(0, ...monthlyRevenue.map((m) => m.amount))
      : 0;

  return (
    <div className="reports-page-workspace mx-auto flex w-full flex-col gap-8 pb-8">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            title="Rapporter"
            actions={
              <Suspense
                fallback={
                  <div
                    className="flex w-full flex-row flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:shrink-0 md:gap-3"
                    aria-hidden
                  >
                    <div className="h-12 min-h-12 w-[5rem] shrink-0 animate-pulse rounded-md bg-muted/60 md:h-14 md:min-h-14 md:w-[5.25rem]" />
                    <div className="h-12 min-h-12 w-40 shrink-0 animate-pulse rounded-md bg-muted/60 md:h-14 md:min-h-14 md:w-48" />
                  </div>
                }
              >
                <ReportsYearMonthCalendar
                  reportYear={reportYear}
                  calendarYearMax={calendarYearMax}
                />
              </Suspense>
            }
          />
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="reports-load-error rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              Kunne ikke laste data: {loadError}
            </div>
          </div>
        ) : null}

        {!loadError && !hasRegisteredActivity ? (
          <div className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6">
            <div className="rounded-md border border-rn-border-strong/60 bg-muted/20 px-4 py-4 text-app-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Ingen registrert aktivitet i perioden ennå.
              </p>
              <p className="mt-2">
                Tall oppdateres automatisk når du registrerer{" "}
                <Link href="/app/bookings/new" className="font-semibold text-success underline-offset-2 hover:underline">
                  reservasjoner
                </Link>
                ,{" "}
                <Link href="/app/inquiries/new" className="font-semibold text-success underline-offset-2 hover:underline">
                  forespørsler
                </Link>{" "}
                eller{" "}
                <Link href="/app/overnatting/new" className="font-semibold text-success underline-offset-2 hover:underline">
                  overnatting
                </Link>
                . Finansinntekter vises separat under Finans.
              </p>
            </div>
          </div>
        ) : null}

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8 md:py-6"
          aria-label="Omsetning og bookinger"
        >
          <div className="space-y-1">
            <h2 className="app-section-title">Omsetning og bookinger</h2>
            <p className="text-app-sm text-muted-foreground">
              Fakturert beløp fra registrerte reservasjoner og overnatting i valgt
              periode. Innbetalt og ubetalt gjelder reservasjoner.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-6">
            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Fakturert</p>
              <p className="reports-kpi-value text-success">{formatNok(kpis.revenueYtd)}</p>
              {kpis.revenueTrendPct != null ? (
                <div
                  className={cn(
                    "reports-kpi-trend mt-3 flex items-center gap-1",
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
                    {kpis.revenueTrendPct.toFixed(1).replace(".", ",")} %{" "}
                    {focusMonth != null
                      ? "mot samme periode i fjor"
                      : "vs. fjorår"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Innbetalt</p>
              <p className="reports-kpi-value text-success">{formatNok(kpis.totalPaid)}</p>
              <div className="mt-4 h-1.5 w-full rounded-full border border-rn-border-strong/30 bg-muted/40">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${Math.min(100, Math.round(kpis.paidShare * 100))}%` }}
                />
              </div>
            </div>

            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Ubetalt</p>
              <p className="reports-kpi-value text-destructive">
                {formatNok(kpis.totalUnpaid)}
              </p>
              {kpis.totalBooked > 0 ? (
                <p className="reports-kpi-caption mt-3 font-medium tabular-nums">
                  {(kpis.unpaidShareOfBooked * 100).toFixed(1).replace(".", ",")} % av
                  fakturert
                </p>
              ) : null}
              {kpis.totalUnpaid > 0 ? (
                <Link
                  href="/app/invoices"
                  className="reports-inline-link mt-2 inline-flex text-success underline-offset-2 hover:underline"
                >
                  Faktura →
                </Link>
              ) : null}
            </div>

            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Bookinger</p>
              <p className="reports-kpi-value text-success">{kpis.bookingCount}</p>
              <p className="reports-kpi-caption-strong mt-3">
                <span className="text-emerald-600">
                  {kpis.confirmedBookingCount} bekreftet
                </span>
                {" · "}
                <span className="text-amber-700 dark:text-amber-400">
                  {kpis.pendingBookingCount} venter
                </span>
              </p>
            </div>

            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Forespørsler</p>
              <p className="reports-kpi-value text-foreground">{kpis.inquiryCount}</p>
              <p className="reports-kpi-caption mt-3">
                Estimert{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNok(kpis.inquiryEstimatedTotal)}
                </span>
              </p>
            </div>

            <div className={kpiTileClass}>
              <p className="reports-kpi-label mb-3">Overnatting</p>
              <p className="reports-kpi-value text-foreground">{kpis.accommodationCount}</p>
              <p className="reports-kpi-caption mt-3">
                Fakturert{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatNok(kpis.accommodationBookedNok)}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-rn-border-strong/50 pt-8">
            <h2 className="app-section-title">Drift og eiendom</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
              <div className={kpiTileClass}>
                <p className="reports-kpi-label mb-3">I drift</p>
                <p className="reports-kpi-value text-emerald-700 dark:text-emerald-400">
                  {facility.assetOperationalCount}
                </p>
                <p className="reports-kpi-caption mt-2">
                  God / normal tilstand
                </p>
              </div>
              <div className={kpiTileClass}>
                <div className="reports-kpi-label mb-3 flex items-center gap-2">
                  <Wrench className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
                  Vedlikehold
                </div>
                <p className="reports-kpi-value text-amber-900 dark:text-amber-200">
                  {facility.assetMaintenanceCount}
                </p>
                <p className="reports-kpi-caption mt-2">
                  Krever oppfølging
                </p>
              </div>
              <div className={kpiTileClass}>
                <div className="reports-kpi-label mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" aria-hidden />
                  Skal byttes
                </div>
                <p className="reports-kpi-value text-destructive">
                  {facility.assetReplaceCount}
                </p>
                <p className="reports-kpi-caption mt-2">
                  Utbedring eller erstatning
                </p>
              </div>
              <div className={kpiTileClass}>
                <div className="reports-kpi-label mb-3 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                  Forsikret verdi
                </div>
                <p className="reports-kpi-value text-foreground">
                  {formatNok(facility.assetInsuredValueNok)}
                </p>
                <p className="reports-kpi-caption mt-2">
                  {facility.assetInsuredLineCount}{" "}
                  {facility.assetInsuredLineCount === 1 ? "linje" : "linjer"} som
                  forsikret
                </p>
              </div>
              <div className={kpiTileClass}>
                <div className="reports-kpi-label mb-3 flex items-center gap-2">
                  <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
                  Uforsikret verdi
                </div>
                <p className="reports-kpi-value text-foreground">
                  {formatNok(facility.assetUninsuredValueNok)}
                </p>
                <p className="reports-kpi-caption mt-2">
                  {facility.assetUninsuredLineCount}{" "}
                  {facility.assetUninsuredLineCount === 1
                    ? "øvrig linje"
                    : "øvrige linjer"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className={paddedCard("lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="app-section-title">Omsetning per måned</h2>
            <span className="reports-chart-period-badge max-w-[14rem] rounded-full bg-secondary px-3 py-1 text-center tracking-wide text-secondary-foreground sm:max-w-none">
              {focusMonth != null
                ? reportsPeriodLabel
                : `${reportYear} · kalenderår`}
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
                  className={cn(
                    "group relative flex h-full min-w-0 flex-1 flex-col items-stretch justify-end transition-opacity",
                    focusMonth != null &&
                      m.monthIndex !== focusMonth &&
                      "opacity-35",
                    focusMonth != null &&
                      m.monthIndex === focusMonth &&
                      "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "reports-chart-tooltip pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-rn-accent-border bg-success px-2 py-0.5 whitespace-nowrap text-primary-foreground shadow-md group-hover:block",
                      focusMonth === m.monthIndex && "block",
                    )}
                  >
                    {formatNok(m.amount)}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-colors",
                      hasValue
                        ? "min-h-[4px] bg-emerald-500/90 group-hover:bg-emerald-600"
                        : "h-1 shrink-0 rounded-sm bg-muted/50",
                      focusMonth === m.monthIndex &&
                        hasValue &&
                        "ring-2 ring-success ring-offset-2 ring-offset-background",
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
          <div className="reports-chart-axis mt-4 flex justify-between tracking-wide">
            {monthlyRevenue.map((m) => (
              <span
                key={m.monthIndex}
                className={cn(
                  focusMonth != null &&
                    m.monthIndex !== focusMonth &&
                    "opacity-35",
                )}
              >
                {m.label}
              </span>
            ))}
          </div>
        </section>

        <section className={paddedCard("p-7 md:p-8")}>
          <h2 className="app-section-title mb-8">Privat og bedrift</h2>
          {kpis.bookingCount === 0 ? (
            <p className="reports-empty-hint">
              {focusMonth != null
                ? "Ingen bookinger med arrangement i denne måneden."
                : "Ingen aktive bookinger å vise i perioden."}
            </p>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {eventBreakdown.map((row, i) => (
                <BreakdownRow key={row.eventType} row={row} index={i} />
              ))}
              {festTypeBreakdown.length > 0 ? (
                <div className="border-t border-rn-border-strong/40 pt-8">
                  <h3 className="mb-6 text-app-base font-bold tracking-tight text-foreground">
                    Arrangementstyper
                  </h3>
                  <div className="flex flex-col gap-8">
                    {festTypeBreakdown.map((row, i) => (
                      <FestTypeBreakdownRow key={row.festType} row={row} index={i} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
