"use client";

import { PRODUCT_PREVIEW_ICONS } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";

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

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-[#e8f5ee] text-[#1a4331]",
  partial: "bg-[#fdf3dc] text-[#7a5410]",
  inquiry: "bg-[#eef2f0] text-[#475569]",
};

// June 2026 starts on a Monday; dates carrying a booking are marked.
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const BOOKED: Record<number, "confirmed" | "partial" | "inquiry"> = {
  14: "confirmed",
  22: "partial",
};

export function ProductPreviewSection() {
  const { t, locale } = useTranslation();
  const [active, setActive] = useState(0);
  const dict = useMemo(() => getDictionary(locale).landing, [locale]);
  const items = dict.productPreview.items;
  const demo = dict.heroDemo;
  const current = items[active]!;

  return (
    <section
      aria-labelledby="landing-preview-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:items-center lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2
              id="landing-preview-title"
              className="max-w-[20ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
            >
              {t("landing.sections.productPreview")}
            </h2>
            <p className="landing-subhead max-w-[44ch]">
              {t("landing.productPreview.description")}
            </p>
          </div>

          <div
            role="group"
            className="inline-flex w-fit max-w-full gap-1 rounded-full bg-[#eef2f0] p-1"
          >
            {items.map((item, index) => {
              const Icon = PRODUCT_PREVIEW_ICONS[index]!;
              const on = index === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActive(index)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors",
                    on
                      ? "bg-[#1a4331] text-white"
                      : "text-[#334155] hover:bg-white/70",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.title}
                </button>
              );
            })}
          </div>

          <ul className="flex flex-col gap-3">
            {current.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 text-base text-[#1a1c1a] md:text-lg"
              >
                <Check
                  className="mt-1 size-5 shrink-0 text-[#1a4331]"
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="overflow-hidden rounded-3xl bg-[#e8f5ee] p-4 sm:p-8 lg:p-10"
          aria-hidden
        >
          <div className="min-h-[340px] rounded-2xl bg-white p-5 shadow-[0_24px_64px_-28px_rgba(0,45,28,0.35)] md:p-7">
            {active === 0 ? (
              <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[13px]">
                  {DAYS.map((day) => {
                    const state = BOOKED[day];
                    return (
                      <span
                        key={day}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg",
                          state === "confirmed" && "bg-[#1a4331] font-bold text-white",
                          state === "partial" && "bg-[#fdf3dc] font-bold text-[#7a5410]",
                          !state && "text-[#475569]",
                          day === 1 && "col-start-1",
                        )}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
                <ul className="flex flex-col justify-center divide-y divide-[#eef1ee]">
                  {demo.bookings.map((row) => (
                    <li key={row.event} className="flex flex-col gap-1 py-3">
                      <span className="flex items-center justify-between gap-2 text-[15px] font-semibold">
                        {row.event}
                        <span className="text-[13px] font-normal text-[#64748b]">
                          {row.date}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_TONE[row.statusKey] ?? STATUS_TONE.inquiry,
                        )}
                      >
                        {statusLabel(row.statusKey, t)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {active === 1 ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t("landing.miniPreview.income"), value: "kr 128k" },
                    { label: t("landing.miniPreview.unpaid"), value: "kr 24k" },
                    { label: "Margin", value: "62 %" },
                  ].map((kpi, i) => (
                    <div
                      key={kpi.label}
                      className={cn(
                        "rounded-xl px-3.5 py-3",
                        i === 0 ? "bg-[#1a4331] text-white" : "bg-[#f4f6f3]",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-medium",
                          i === 0 ? "text-[#b9d3c4]" : "text-[#475569]",
                        )}
                      >
                        {kpi.label}
                      </p>
                      <p className="mt-1 font-heading text-xl font-bold tracking-tight whitespace-nowrap md:text-2xl">
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Betalt denne måneden</span>
                    <span className="text-[#1a4331]">78 %</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#e8f5ee]">
                    <div className="h-full w-[78%] rounded-full bg-[#1a4331]" />
                  </div>
                </div>
              </div>
            ) : null}

            {active === 2 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-heading text-base font-semibold">
                    {demo.monthlyRevenue}
                  </p>
                  <p className="font-heading text-base font-bold text-[#1a4331]">
                    {demo.demoRevenue}
                  </p>
                </div>
                <div className="flex h-52 items-end gap-1.5">
                  {CHART_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-md",
                        i === 5 ? "bg-[#1a4331]" : "bg-[#d3e6da]",
                      )}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5 text-[10px] font-medium text-[#64748b]">
                  {CHART_MONTHS.map((m) => (
                    <span key={m} className="min-w-0 flex-1 text-center">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
