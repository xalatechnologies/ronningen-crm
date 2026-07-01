"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function HowItWorksSection() {
  const { t, locale } = useTranslation();
  const steps = useMemo(
    () => getDictionary(locale).landing.howItWorks.steps,
    [locale],
  );

  return (
    <section
      id="slik-fungerer-det"
      aria-labelledby="landing-how-title"
      className={cn(
        LANDING_SECTION_X,
        "border-y-2 border-rn-accent-border bg-success py-16 text-white md:py-24",
      )}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-10 md:gap-14")}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
          <p className="text-app-sm font-semibold tracking-wide text-primary-light uppercase">
            {t("landing.howItWorks.eyebrow")}
          </p>
          <h2
            id="landing-how-title"
            className="landing-headline tracking-tight !text-white"
          >
            {t("landing.sections.howItWorks")}
          </h2>
          <p className="landing-body leading-relaxed !text-white/90">
            {t("landing.howItWorks.subtitle")}
          </p>
        </div>

        <div className="relative">
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {steps.map((item, index) => (
              <li
                key={item.title}
                className="relative flex flex-col items-center gap-4"
              >
                {index < steps.length - 1 ? (
                  <div
                    className="pointer-events-none absolute top-6 left-[calc(50%+1.5rem)] z-0 hidden h-[2px] w-[calc(100%-1.75rem)] overflow-visible lg:block"
                    aria-hidden
                  >
                    <div className="h-full w-full rounded-full bg-linear-to-r from-primary-light/30 via-white/70 to-primary-light/30" />
                    <span className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-primary-light/80 ring-2 ring-success" />
                  </div>
                ) : null}

                <span
                  className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-rn-accent-border bg-white text-app-lg font-bold text-success shadow-rn-hero-success ring-4 ring-success/30"
                  aria-hidden
                >
                  {index + 1}
                </span>

                <article className="flex w-full flex-1 flex-col gap-3 rounded-[length:var(--app-radius)] border-2 border-rn-accent-border/40 bg-card p-5 text-center shadow-rn-hero-success md:p-6 lg:text-left">
                  <h3 className="app-card-title md:text-app-xl">{item.title}</h3>
                  <p className="landing-body leading-relaxed">{item.text}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
