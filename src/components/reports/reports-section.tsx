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
import type { EventTypeBreakdown, ReportsSectionProps } from "./types";

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
            "inline-flex w-fit rounded-full px-3 py-1.5 text-base font-bold tracking-wide uppercase md:px-4 md:py-2",
            eventPillClass(row.eventType),
          )}
        >
          {row.eventType}
        </span>
        <span className="text-left text-base font-bold tabular-nums sm:text-right">
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
  facility,
  reportYear,
  calendarYearMax,
  focusMonth,
  reportsPeriodLabel,
  loadError,
}: ReportsSectionProps) {
  const paddedCard = (extra?: string) =>
    cn("p-6", RN_CARD_SHELL, extra);

  const maxMonthlyAmount =
    monthlyRevenue.length > 0
      ? Math.max(0, ...monthlyRevenue.map((m) => m.amount))
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-24 md:pb-8">
      <div className={cn("mb-8 overflow-hidden", RN_CARD_SHELL)}>
        <div
          className={cn(
            "flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 md:flex-row md:items-start md:justify-between md:gap-6 lg:px-6",
          )}
        >
          <h1 className="font-heading text-3xl font-bold tracking-tight text-rn-text-heading md:text-4xl">
            Rapporter
          </h1>
          <Suspense
            fallback={
              <div
                className="flex w-full flex-row flex-wrap items-center justify-end gap-2 py-0.5 sm:ml-auto sm:w-auto sm:shrink-0 sm:py-1 md:gap-3"
                aria-hidden
              >
                <div className="h-[3.375rem] w-[5rem] shrink-0 animate-pulse rounded-md bg-muted/60 md:h-[3.625rem] md:w-[5.25rem]" />
                <div className="h-[3.375rem] w-40 shrink-0 animate-pulse rounded-md bg-muted/60 md:h-[3.625rem] md:w-48" />
              </div>
            }
          >
            <ReportsYearMonthCalendar
              reportYear={reportYear}
              calendarYearMax={calendarYearMax}
            />
          </Suspense>
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-base text-destructive">
              Kunne ikke laste data: {loadError}
            </div>
          </div>
        ) : null}

        <section className="border-t border-rn-border-strong/50 px-4 py-6 sm:px-6 md:px-8 md:py-6">
          <h2 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
            Omsetning og bookinger
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
            <div className="min-w-0">
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
                    {kpis.revenueTrendPct.toFixed(1).replace(".", ",")} %{" "}
                    {focusMonth != null
                      ? "mot samme periode i fjor"
                      : "vs. fjorår"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
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

            <div className="min-w-0">
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

            <div className="min-w-0">
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
          </div>

          <div className="mt-10 border-t border-rn-border-strong/50 pt-8">
            <h2 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading md:text-2xl">
              Drift og eiendom
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
            <div className="min-w-0">
              <p className="mb-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                I drift
              </p>
              <p className="font-heading text-3xl font-extrabold tabular-nums text-emerald-700 sm:text-4xl dark:text-emerald-400">
                {facility.assetOperationalCount}
              </p>
              <p className="mt-2 text-base text-muted-foreground">
                God / normal tilstand
              </p>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <Wrench className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
                Vedlikehold
              </div>
              <p className="font-heading text-3xl font-extrabold tabular-nums text-amber-900 sm:text-4xl dark:text-amber-200">
                {facility.assetMaintenanceCount}
              </p>
              <p className="mt-2 text-base text-muted-foreground">
                Krever oppfølging
              </p>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <AlertTriangle className="size-4 text-destructive" aria-hidden />
                Skal byttes
              </div>
              <p className="font-heading text-3xl font-extrabold tabular-nums text-destructive sm:text-4xl">
                {facility.assetReplaceCount}
              </p>
              <p className="mt-2 text-base text-muted-foreground">
                Utbedring eller erstatning
              </p>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <ShieldCheck className="size-4 text-success" aria-hidden />
                Forsikret verdi
              </div>
              <p className="font-heading text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
                {formatNok(facility.assetInsuredValueNok)}
              </p>
              <p className="mt-2 text-base text-muted-foreground">
                {facility.assetInsuredLineCount}{" "}
                {facility.assetInsuredLineCount === 1 ? "linje" : "linjer"} som
                forsikret
              </p>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
                Uforsikret verdi
              </div>
              <p className="font-heading text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
                {formatNok(facility.assetUninsuredValueNok)}
              </p>
              <p className="mt-2 text-base text-muted-foreground">
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

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className={paddedCard("lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Omsetning per måned
            </h2>
            <span className="max-w-[14rem] rounded-full bg-secondary px-3 py-1 text-center text-[11px] font-semibold tracking-wide text-secondary-foreground uppercase sm:max-w-none sm:text-[12px]">
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
                      "pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded border border-rn-accent-border bg-success px-2 py-0.5 text-[10px] whitespace-nowrap text-primary-foreground shadow-md group-hover:block",
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
          <div className="mt-4 flex justify-between text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
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
          <h2 className="mb-8 font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Privat og bedrift
          </h2>
          {kpis.bookingCount === 0 ? (
            <p className="text-base text-muted-foreground">
              {focusMonth != null
                ? "Ingen bookinger med arrangement i denne måneden."
                : "Ingen aktive bookinger å vise i perioden."}
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
    </div>
  );
}
