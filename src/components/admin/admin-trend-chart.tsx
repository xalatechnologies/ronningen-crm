"use client";

import { formatNok } from "@/lib/admin/revenue-metrics";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type TrendPoint = {
  label: string;
  value: number;
};

export type TrendValueFormat = "number" | "nok";

type AdminTrendChartProps = {
  title: string;
  points: TrendPoint[];
  valueFormat?: TrendValueFormat;
  className?: string;
  embedded?: boolean;
};

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
      k >= 100 ? k.toFixed(0) : k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(".", ",");
    return `${s} k`;
  }
  return formatNok(n);
}

function formatNumberChartAxis(n: number) {
  if (n >= 1000) {
    const k = n / 1000;
    const s =
      k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(".", ",");
    return `${s}k`;
  }
  return String(n);
}

function formatTrendValue(value: number, valueFormat: TrendValueFormat): string {
  if (valueFormat === "nok") return formatNok(value);
  return String(value);
}

export function AdminTrendChart({
  title,
  points,
  valueFormat = "number",
  className,
  embedded = false,
}: AdminTrendChartProps) {
  const chartBars = useMemo(() => {
    const max = Math.max(0, ...points.map((p) => p.value));
    const scaleMax = max > 0 ? max : 1;
    const lastIndex = points.length - 1;

    return points.map((point, index) => {
      const hasValue = point.value > 0;
      const rawPct = (point.value / scaleMax) * 100;
      const heightPct = hasValue ? Math.max(14, rawPct) : 0;

      return {
        key: `${point.label}-${index}`,
        label: point.label,
        value: point.value,
        hasValue,
        heightPct,
        highlight: index === lastIndex,
      };
    });
  }, [points]);

  const peakValue = Math.max(0, ...points.map((p) => p.value));
  const formatAxis =
    valueFormat === "nok" ? formatNokChartAxis : formatNumberChartAxis;
  const periodHint =
    points.length > 7 ? "Siste 12 måneder" : "Siste 7 dager";

  return (
    <section
      className={cn(
        embedded
          ? "min-w-0"
          : cn(
              RN_CARD_SHELL,
              "overflow-hidden p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
            ),
        className,
      )}
    >
      <h2 className="app-section-title">{title}</h2>

      <div className="mt-4 border-t border-rn-border-strong/35 pt-4">
        <div
          className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"
          aria-hidden
        >
          <span className="text-xs font-semibold text-muted-foreground md:text-sm">
            {periodHint}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground md:text-xs">
            Høyeste: {formatTrendValue(peakValue, valueFormat)}
          </span>
        </div>

        <div
          className="flex h-[min(16rem,calc(100vw-4rem))] min-h-[11rem] w-full items-stretch gap-0.5 sm:gap-1 md:gap-1.5"
          role="img"
          aria-label={`${title}. ${points
            .map((point) => `${point.label}: ${formatTrendValue(point.value, valueFormat)}`)
            .join(", ")}`}
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
                    bar.hasValue ? "text-foreground" : "text-muted-foreground",
                  )}
                  title={`${bar.label}: ${formatTrendValue(bar.value, valueFormat)}`}
                >
                  {formatAxis(bar.value)}
                </span>
                <div className="relative flex min-h-[5rem] flex-1 flex-col justify-end border-b-2 border-rn-border-strong/55 sm:min-h-[6rem] md:min-h-[7rem]">
                  {bar.hasValue ? (
                    <div
                      className={cn(
                        "w-full min-h-[6px] rounded-t-md transition-colors",
                        bar.highlight
                          ? "bg-success shadow-md ring-2 ring-success/30 ring-offset-1 ring-offset-background"
                          : "bg-emerald-500/80 hover:bg-emerald-600 dark:bg-emerald-500/60 dark:hover:bg-emerald-500",
                      )}
                      style={{ height: `${bar.heightPct}%` }}
                      title={`${bar.label}: ${formatTrendValue(bar.value, valueFormat)}`}
                    />
                  ) : (
                    <div
                      className="h-1.5 w-full shrink-0 rounded-sm bg-muted-foreground/25"
                      title={`${bar.label}: ${formatTrendValue(bar.value, valueFormat)}`}
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
    </section>
  );
}
