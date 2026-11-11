"use client";

import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
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
const HIGHLIGHT = 5;

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-[#e8f5ee] text-[#1a4331]",
  partial: "bg-[#fdf3dc] text-[#7a5410]",
  inquiry: "bg-[#eef2f0] text-[#475569]",
};

export function HeroDashboardPreview() {
  const { t, locale } = useTranslation();
  const heroDemo = useMemo(
    () => getDictionary(locale).landing.heroDemo,
    [locale],
  );
  const unpaid = heroDemo.stats[2];
  const firstBooking = heroDemo.bookings[0];

  return (
    <div className="relative pb-10 lg:pb-0" aria-hidden>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-24px_rgba(0,45,28,0.28),0_0_0_1px_rgba(0,45,28,0.06)]">
        <div className="flex items-center gap-3 bg-[#f4f6f3] px-4 py-3">
          <span className="flex gap-1.5">
            <i className="size-2.5 rounded-full bg-[#d5dbd7]" />
            <i className="size-2.5 rounded-full bg-[#d5dbd7]" />
            <i className="size-2.5 rounded-full bg-[#d5dbd7]" />
          </span>
          <p className="font-heading text-[13px] font-semibold text-[#1a1c1a]">
            {heroDemo.dashboard}
          </p>
          <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#475569]">
            {heroDemo.demo}
          </span>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          <div className="grid grid-cols-3 gap-3">
            {heroDemo.stats.map((stat, i) => (
              <div
                key={stat.labelKey}
                className={cn(
                  "rounded-xl px-3.5 py-3",
                  i === 0 ? "bg-[#1a4331] text-white" : "bg-[#f4f6f3]",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    i === 0 ? "text-[#b9d3c4]" : "text-[#475569]",
                  )}
                >
                  {t(
                    `landing.heroStats.${stat.labelKey}` as "landing.heroStats.revenue",
                  )}
                </p>
                <p className="mt-1 font-heading text-[15px] leading-tight font-bold tracking-tight whitespace-nowrap sm:text-[17px] md:text-xl">
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[11px]",
                    i === 0 ? "text-[#b9d3c4]" : "text-[#64748b]",
                  )}
                >
                  {t(
                    `landing.heroStats.${stat.hintKey}` as "landing.heroStats.thisMonth",
                  )}
                </p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="font-heading text-[13px] font-semibold text-[#1a1c1a]">
                {heroDemo.monthlyRevenue}
              </p>
              <p className="font-heading text-[13px] font-bold text-[#1a4331]">
                {heroDemo.demoRevenue}
              </p>
            </div>
            <div className="flex h-28 items-end gap-1.5 md:h-32">
              {CHART_HEIGHTS.map((height, index) => (
                <div
                  key={index}
                  className={cn(
                    "min-h-1 flex-1 rounded-[5px]",
                    index === HIGHLIGHT ? "bg-[#1a4331]" : "bg-[#d3e6da]",
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5 text-[10px] font-medium text-[#64748b]">
              {CHART_MONTHS.map((month) => (
                <span key={month} className="min-w-0 flex-1 text-center">
                  {month}
                </span>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-[#eef1ee]">
            {heroDemo.bookings.map((row) => (
              <li
                key={`${row.event}-${row.date}`}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-[#1a1c1a]">
                  {row.event}
                </span>
                <span className="text-[13px] text-[#64748b]">{row.date}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_TONE[row.statusKey] ?? STATUS_TONE.inquiry,
                  )}
                >
                  {statusLabel(row.statusKey, t)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute right-3 bottom-0 flex items-center gap-3 rounded-2xl bg-white py-3 pr-5 pl-3 shadow-[0_16px_40px_-12px_rgba(0,45,28,0.3),0_0_0_1px_rgba(0,45,28,0.06)] lg:-bottom-14 lg:-left-10 lg:right-auto">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#1a4331] text-white">
          <CheckIcon className="size-5" strokeWidth={2.5} />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-[#1a1c1a]">
            {firstBooking.event} · {firstBooking.date}
          </span>
          <span className="block text-xs text-[#475569]">
            {statusLabel(firstBooking.statusKey, t)} · {unpaid.value}
          </span>
        </span>
      </div>
    </div>
  );
}
