"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { HowItWorksPanel } from "@/components/landing/how-it-works-panels";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

const STEP_MS = 5000;

export function HowItWorksSection() {
  const { t, locale } = useTranslation();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const dict = useMemo(() => getDictionary(locale).landing, [locale]);
  const steps = dict.howItWorks.steps;

  // Auto-advance 1 -> 2 -> 3 -> 4 -> 1; hover/focus pauses, a click restarts the timer.
  const auto = !paused;
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % steps.length),
      STEP_MS,
    );
    return () => window.clearTimeout(id);
  }, [auto, active, steps.length]);

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

          <ol
            className="flex flex-col gap-2"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {steps.map((item, index) => {
              const on = index === active;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={on}
                    className={cn(
                      "relative flex w-full items-start gap-4 overflow-hidden rounded-2xl p-4 text-left transition-colors md:p-5",
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
                    {on && auto ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#85b098] motion-reduce:hidden"
                        style={{ animation: `hiw-progress ${STEP_MS}ms linear forwards` }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex items-center" aria-hidden>
          <HowItWorksPanel key={active} step={active} />
        </div>
      </div>
    </section>
  );
}
