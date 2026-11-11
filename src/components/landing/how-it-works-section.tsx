"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const CHART_HEIGHTS = [40, 65, 52, 78, 58, 88, 72, 48, 82, 60, 70, 55] as const;

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-[#e8f5ee] text-[#1a4331]",
  partial: "bg-[#fdf3dc] text-[#7a5410]",
  inquiry: "bg-[#eef2f0] text-[#475569]",
};

export function HowItWorksSection() {
  const { t, locale } = useTranslation();
  const [active, setActive] = useState(0);
  const dict = useMemo(() => getDictionary(locale).landing, [locale]);
  const steps = dict.howItWorks.steps;
  const demo = dict.heroDemo;
  const pricing = dict.features.items[2];

  return (
    <section
      id="slik-fungerer-det"
      aria-labelledby="landing-how-title"
      className={cn(
        LANDING_SECTION_X,
        "bg-[#1a4331] py-16 text-white md:py-24 lg:py-32",
      )}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <h2
              id="landing-how-title"
              className="max-w-[20ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] !text-white"
            >
              {t("landing.sections.howItWorks")}
            </h2>
            <p className="max-w-[44ch] text-lg leading-relaxed !text-[#d6e6dc]">
              {t("landing.howItWorks.subtitle")}
            </p>
          </div>

          <ol className="flex flex-col gap-2">
            {steps.map((item, index) => {
              const on = index === active;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors md:p-5",
                      on ? "bg-white/10" : "hover:bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                        on
                          ? "bg-white text-[#1a4331]"
                          : "bg-white/15 text-[#d6e6dc]",
                      )}
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="font-heading text-lg font-semibold !text-white md:text-xl">
                        {item.title}
                      </span>
                      <span
                        className={cn(
                          "text-base leading-relaxed text-[#d6e6dc]",
                          !on && "hidden lg:block lg:opacity-70",
                        )}
                      >
                        {item.text}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex items-center" aria-hidden>
          <div
            key={active}
            className="w-full rounded-3xl bg-white p-5 text-[#1a1c1a] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.5)] md:p-8"
          >
            {active === 0 ? (
              <ul className="divide-y divide-[#eef1ee]">
                {demo.bookings.map((row, i) => (
                  <li
                    key={row.event}
                    className={cn(
                      "flex items-center gap-3 py-3.5 text-[15px]",
                      i === 0 && "font-semibold",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{row.event}</span>
                    <span className="text-[#64748b]">{row.date}</span>
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
            ) : null}

            {active === 1 ? (
              <div className="flex flex-col gap-6 py-4">
                <div>
                  <p className="font-heading text-2xl font-semibold text-[#0c1f16]">
                    {pricing.title}
                  </p>
                  <p className="mt-1 text-[15px] text-[#475569]">
                    {pricing.text}
                  </p>
                </div>
                <p className="font-heading text-5xl font-bold tracking-tight text-[#1a4331]">
                  {demo.stats[2].value}
                </p>
              </div>
            ) : null}

            {active === 2 ? (
              <div className="flex flex-col gap-5 py-4">
                <p className="font-heading text-2xl font-semibold text-[#0c1f16]">
                  {t("landing.heroStats.outstanding")}
                </p>
                <p className="font-heading text-5xl font-bold tracking-tight text-[#1a4331]">
                  {demo.stats[2].value}
                </p>
                <div className="h-3 overflow-hidden rounded-full bg-[#e8f5ee]">
                  <div className="h-full w-[72%] rounded-full bg-[#1a4331]" />
                </div>
              </div>
            ) : null}

            {active === 3 ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-heading text-lg font-semibold text-[#0c1f16]">
                    {demo.monthlyRevenue}
                  </p>
                  <p className="font-heading text-lg font-bold text-[#1a4331]">
                    {demo.demoRevenue}
                  </p>
                </div>
                <div className="flex h-44 items-end gap-2">
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
