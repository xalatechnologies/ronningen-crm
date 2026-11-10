"use client";

import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const CHART_HEIGHTS = [40, 65, 52, 78, 58, 88, 72, 48, 82, 60, 70, 55] as const;
const CHART_MONTHS = [
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

export function HeroDashboardPreview() {
  const { t, locale } = useTranslation();
  const heroDemo = useMemo(
    () => getDictionary(locale).landing.heroDemo,
    [locale],
  );

  return (
    <div
      className={cn(
        RN_CARD_SHELL,
        "overflow-hidden bg-card p-4 shadow-rn-card md:p-6",
      )}
      aria-hidden
    >
      <div className="mb-4 flex items-center justify-between border-b border-rn-border-strong/50 pb-3">
        <p className="font-heading text-sm font-semibold text-rn-text-heading">
          {heroDemo.dashboard}
        </p>
        <span className="rounded-full border border-rn-badge-border bg-rn-badge-surface px-2.5 py-0.5 text-xs font-medium text-rn-text-slate">
          {heroDemo.demo}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {heroDemo.stats.map((stat) => (
          <div
            key={stat.labelKey}
            className="rounded-[length:var(--app-radius)] border border-rn-border-strong/70 bg-rn-surface-wash px-3 py-3"
          >
            <p className="text-xs font-medium text-rn-text-slate">
              {t(
                `landing.heroStats.${stat.labelKey}` as "landing.heroStats.revenue",
              )}
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-rn-text-heading">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                `landing.heroStats.${stat.hintKey}` as "landing.heroStats.thisMonth",
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-[length:var(--app-radius)] border-2 border-success/25 bg-gradient-to-br from-rn-primary-soft via-white to-rn-surface-gradient-from p-4 shadow-rn-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-heading text-xs font-bold uppercase tracking-wide text-success">
            {heroDemo.monthlyRevenue}
          </p>
          <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
            {heroDemo.demoRevenue}
          </span>
        </div>
        <div className="flex h-32 items-end justify-between gap-1.5 rounded-md border border-success/15 bg-white/70 p-3">
          {CHART_HEIGHTS.map((height, index) => (
            <div
              key={index}
              className={cn(
                "min-h-[4px] flex-1 rounded-t-md bg-gradient-to-t from-success to-emerald-500 shadow-sm transition-colors hover:to-emerald-600",
                index === 5 && "ring-2 ring-success/35 ring-offset-2 ring-offset-white",
              )}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-success/75">
          {CHART_MONTHS.map((month) => (
            <span key={month} className="min-w-0 flex-1 text-center">
              {month}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[length:var(--app-radius)] border border-rn-border-strong/70">
        <div className="grid grid-cols-3 gap-2 border-b border-rn-border-strong/70 bg-rn-surface-table-head px-3 py-2 text-xs font-semibold text-rn-text-column">
          <span>{heroDemo.tableEvent}</span>
          <span>{heroDemo.tableDate}</span>
          <span>{heroDemo.tableStatus}</span>
        </div>
        {heroDemo.bookings.map((row) => (
          <div
            key={`${row.event}-${row.date}`}
            className="grid grid-cols-3 gap-2 border-b border-rn-border-strong/40 px-3 py-2.5 text-sm last:border-b-0"
          >
            <span className="font-medium text-rn-text-heading">{row.event}</span>
            <span className="text-rn-text-slate">{row.date}</span>
            <span className="text-rn-text-slate">
              {statusLabel(row.statusKey, t)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
