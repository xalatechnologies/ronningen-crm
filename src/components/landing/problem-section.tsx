"use client";

import {
  PROBLEM_ICONS,
  SCATTERED_SOURCE_KEYS,
} from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function ProblemSection() {
  const { t, locale } = useTranslation();
  const problems = useMemo(
    () => getDictionary(locale).landing.problem.items,
    [locale],
  );

  return (
    <section
      aria-labelledby="landing-problem-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <h2
            id="landing-problem-title"
            className="max-w-[18ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
          >
            {t("landing.sections.problem")}
          </h2>
          <p className="landing-subhead max-w-[44ch]">
            {t("landing.problem.description")}
          </p>

          <div className="mt-2 flex flex-col gap-3" aria-hidden>
            <p className="text-sm font-medium text-rn-text-slate">
              {t("landing.problem.withoutSystem")}
            </p>
            <div className="flex flex-wrap gap-2">
              {SCATTERED_SOURCE_KEYS.map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-[#eef2f0] px-4 py-2 text-sm font-medium text-[#334155]"
                >
                  {t(`landing.problem.scatteredSources.${key}`)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <ul className="flex flex-col gap-4">
          {problems.map(({ title, text }, index) => {
            const Icon = PROBLEM_ICONS[index]!;
            const isLast = index === problems.length - 1;

            return (
              <li key={title}>
                <article
                  className={cn(
                    "flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:gap-6 md:p-8",
                    isLast
                      ? "bg-[#1a4331] text-white"
                      : "bg-[#eef2f0] text-[#1a1c1a]",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-7 shrink-0",
                      isLast ? "text-[#85b098]" : "text-[#1a4331]",
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-2">
                    <h3
                      className={cn(
                        "font-heading text-xl font-semibold tracking-tight md:text-2xl",
                        isLast ? "text-white" : "text-[#0c1f16]",
                      )}
                    >
                      {title}
                    </h3>
                    <p
                      className={cn(
                        "max-w-[52ch] text-base leading-relaxed",
                        isLast ? "text-[#d6e6dc]" : "text-[#475569]",
                      )}
                    >
                      {text}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
