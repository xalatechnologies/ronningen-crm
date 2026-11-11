"use client";

import { FEATURE_ICONS } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-[#e8f5ee] text-[#1a4331]",
  partial: "bg-[#fdf3dc] text-[#7a5410]",
  inquiry: "bg-[#eef2f0] text-[#475569]",
};

// Bento placement on a 6-column grid (large screens); tone 1 = solid green.
const TILES = [
  { span: "lg:col-span-4", tone: 0 },
  { span: "lg:col-span-2", tone: 0 },
  { span: "lg:col-span-2", tone: 0 },
  { span: "lg:col-span-4", tone: 1 },
  { span: "lg:col-span-4", tone: 0 },
  { span: "lg:col-span-2", tone: 0 },
] as const;

export function FeaturesSection() {
  const { t, locale } = useTranslation();
  const dict = useMemo(() => getDictionary(locale).landing, [locale]);
  const features = dict.features.items;
  const demo = dict.heroDemo;

  return (
    <section
      id="funksjoner"
      aria-labelledby="landing-features-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-12 lg:gap-16")}>
        <h2
          id="landing-features-title"
          className="max-w-[26ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
        >
          {t("landing.sections.features")}
        </h2>

        <div className="grid gap-4 lg:grid-cols-6">
          {features.map(({ title, text }, index) => {
            const Icon = FEATURE_ICONS[index]!;
            const tile = TILES[index]!;
            const dark = tile.tone === 1;

            return (
              <article
                key={title}
                className={cn(
                  "flex flex-col lg:min-h-56 justify-between gap-8 rounded-2xl p-6 md:p-8",
                  tile.span,
                  dark ? "bg-[#1a4331]" : "bg-[#eef2f0]",
                )}
              >
                <div className="flex flex-col gap-4">
                  <Icon
                    className={cn(
                      "size-7",
                      dark ? "text-[#85b098]" : "text-[#1a4331]",
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-2">
                    <h3
                      className={cn(
                        "font-heading text-xl font-semibold tracking-tight md:text-2xl",
                        dark ? "text-white" : "text-[#0c1f16]",
                      )}
                    >
                      {title}
                    </h3>
                    <p
                      className={cn(
                        "max-w-[44ch] text-base leading-relaxed",
                        dark ? "text-[#d6e6dc]" : "text-[#475569]",
                      )}
                    >
                      {text}
                    </p>
                  </div>
                </div>

                {index === 0 ? (
                  <ul
                    className="divide-y divide-[#eef1ee] rounded-xl bg-white px-4"
                    aria-hidden
                  >
                    {demo.bookings.map((row) => (
                      <li
                        key={row.event}
                        className="flex items-center gap-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-[#1a1c1a]">
                          {row.event}
                        </span>
                        <span className="text-[13px] text-[#64748b]">
                          {row.date}
                        </span>
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

                {index === 3 ? (
                  <div className="flex flex-col gap-3" aria-hidden>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full w-[72%] rounded-full bg-[#85b098]" />
                    </div>
                    <div className="flex justify-between text-sm text-[#d6e6dc]">
                      <span>{t("landing.heroStats.outstanding")}</span>
                      <span className="font-semibold text-white">
                        {demo.stats[2].value}
                      </span>
                    </div>
                  </div>
                ) : null}
                {index === 1 ? (
                  <div
                    className="flex items-center gap-3 rounded-xl bg-white p-4"
                    aria-hidden
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#d3e6da] font-heading text-sm font-bold text-[#1a4331]">
                      FA
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-semibold text-[#1a1c1a]">
                        Familien Andersen
                      </span>
                      <span className="block text-xs text-[#64748b]">
                        3 bookinger · kr 62 000
                      </span>
                    </span>
                  </div>
                ) : null}

                {index === 2 ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-white p-4" aria-hidden>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-[#1a1c1a]">
                        Bryllupspakke
                      </span>
                      <span className="font-heading text-lg font-bold text-[#1a4331]">
                        kr 24 500
                      </span>
                    </div>
                    {["Lokale", "Lydanlegg", "Rydding"].map((line) => (
                      <span
                        key={line}
                        className="flex items-center gap-2 text-[13px] text-[#475569]"
                      >
                        <span className="size-1.5 rounded-full bg-[#85b098]" />
                        {line}
                      </span>
                    ))}
                  </div>
                ) : null}

                {index === 4 ? (
                  <ul
                    className="grid gap-2 sm:grid-cols-3"
                    aria-hidden
                  >
                    {[
                      { name: "Lydanlegg", meta: "Ledig" },
                      { name: "Stoler × 120", meta: "Booket 14. jun" },
                      { name: "Projektor", meta: "Ledig" },
                    ].map((asset) => (
                      <li
                        key={asset.name}
                        className="flex items-center gap-3 rounded-xl bg-white p-3.5"
                      >
                        <span
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
                            asset.meta === "Ledig"
                              ? "bg-[#4d9a6f]"
                              : "bg-[#e0a526]",
                          )}
                        />
                        <span className="leading-tight">
                          <span className="block text-sm font-semibold text-[#1a1c1a]">
                            {asset.name}
                          </span>
                          <span className="block text-xs text-[#64748b]">
                            {asset.meta}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {index === 5 ? (
                  <div className="flex h-24 items-end gap-1.5 rounded-xl bg-white p-4" aria-hidden>
                    {[40, 65, 52, 78, 58, 88, 72].map((h, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-[4px]",
                          i === 5 ? "bg-[#1a4331]" : "bg-[#d3e6da]",
                        )}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
