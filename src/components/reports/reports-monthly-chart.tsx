"use client";

import {
  chartBarFillClass,
  chartEmptyBarClass,
} from "@/lib/charts/chart-theme";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

import type { MonthlyRevenuePoint } from "./types";

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNokChartAxis(n: number) {
  if (n === 0) return "0";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(".", ",");
    return `${s} mill.`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    const s =
      k >= 100 ? k.toFixed(0) : k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(".", ",");
    return `${s} k`;
  }
  return formatNok(n);
}

export type ReportsMonthlyChartProps = {
  monthlyRevenue: MonthlyRevenuePoint[];
  reportYear: number;
  focusMonth: number | null;
  reportsPeriodLabel: string;
};

export function ReportsMonthlyChart({
  monthlyRevenue,
  reportYear,
  focusMonth,
  reportsPeriodLabel,
}: ReportsMonthlyChartProps) {
  const chartBars = useMemo(() => {
    const max = Math.max(0, ...monthlyRevenue.map((m) => m.amount));
    const scaleMax = max > 0 ? max : 1;
    return monthlyRevenue.map((m) => {
      const rawPct = (m.amount / scaleMax) * 100;
      const hasValue = m.amount > 0;
      const heightPct = hasValue ? Math.max(14, rawPct) : 0;
      const isFocused = focusMonth != null && m.monthIndex === focusMonth;
      const dimmed = focusMonth != null && m.monthIndex !== focusMonth;
      return {
        key: `m-${m.monthIndex}`,
        monthIndex: m.monthIndex,
        label: m.label,
        amount: m.amount,
        hasValue,
        heightPct,
        highlight: isFocused,
        dimmed,
      };
    });
  }, [monthlyRevenue, focusMonth]);

  const totalFakturert = useMemo(
    () => monthlyRevenue.reduce((s, m) => s + m.amount, 0),
    [monthlyRevenue],
  );

  const peak = useMemo(() => {
    let best: MonthlyRevenuePoint | null = null;
    for (const m of monthlyRevenue) {
      if (!best || m.amount > best.amount) best = m;
    }
    return best;
  }, [monthlyRevenue]);

  const periodBadge =
    focusMonth != null ? reportsPeriodLabel : `${reportYear} · kalenderår`;

  const chartAriaLabel =
    focusMonth != null
      ? `Stolpediagram for fakturert omsetning i ${reportsPeriodLabel}.`
      : `Stolpediagram for fakturert omsetning per måned i ${reportYear}. Beløp vises over hver stolpe.`;

  const allZero = totalFakturert === 0;

  return (
    <div className={cn("overflow-hidden lg:col-span-2", RN_CARD_SHELL)}>
      <div className="flex flex-col gap-3 border-b-2 border-rn-border-strong px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 md:px-6 md:py-6">
        <div>
          <h2 className="app-section-title">Månedlig omsetning</h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            Fakturert fra reservasjoner og overnatting etter arrangements- og
            innsjekksdato.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-rn-border-strong/60 bg-muted/30 px-3 py-1.5 text-app-xs font-semibold tabular-nums text-foreground sm:text-app-sm">
          {periodBadge}
        </span>
      </div>

      <div className="border-t border-rn-border-strong/35 px-4 py-5 md:px-6 md:py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Totalt i perioden
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-success md:text-3xl">
              {formatNok(totalFakturert)}
            </p>
          </div>
          {!allZero && peak && peak.amount > 0 ? (
            <p className="text-app-sm text-muted-foreground">
              Høyeste måned:{" "}
              <span className="font-semibold text-foreground">
                {peak.label} · {formatNok(peak.amount)}
              </span>
            </p>
          ) : null}
        </div>

        {allZero ? (
          <div className="flex min-h-[13rem] flex-col items-center justify-center rounded-md border border-dashed border-rn-border-strong/50 bg-muted/15 px-4 py-10 text-center">
            <p className="font-medium text-foreground">Ingen omsetning å vise</p>
            <p className="mt-2 max-w-sm text-app-sm text-muted-foreground">
              {focusMonth != null
                ? `Ingen fakturert omsetning registrert i ${reportsPeriodLabel}.`
                : `Ingen fakturert omsetning registrert i ${reportYear} ennå.`}
            </p>
          </div>
        ) : (
          <>
            <div
              className="flex h-[min(20rem,calc(100vw-4rem))] min-h-[13.5rem] w-full items-stretch gap-0.5 sm:gap-1 md:gap-1.5"
              role="img"
              aria-label={chartAriaLabel}
            >
              {chartBars.map((bar) => (
                <div
                  key={bar.key}
                  className={cn(
                    "flex h-full min-h-0 min-w-0 flex-1 flex-col justify-end transition-opacity",
                    bar.dimmed && "opacity-35",
                  )}
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
                    bar.dimmed && "opacity-60",
                  )}
                >
                  {bar.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
