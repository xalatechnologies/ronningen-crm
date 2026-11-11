"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function AudienceSection() {
  const { t, locale } = useTranslation();
  const items = useMemo(
    () => getDictionary(locale).landing.audience.items,
    [locale],
  );

  return (
    <section
      aria-labelledby="landing-audience-title"
      className={cn(LANDING_SECTION_X, "bg-[#eef2f0] py-16 md:py-24 lg:py-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20",
        )}
      >
        <h2
          id="landing-audience-title"
          className="max-w-[16ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16] lg:sticky lg:top-28 lg:self-start"
        >
          {t("landing.sections.audience")}
        </h2>

        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item}
              className="font-heading text-[clamp(28px,4.2vw,56px)] leading-[1.15] font-semibold tracking-[-0.025em] text-[#0c1f16] transition-colors duration-200 hover:text-[#4d7a63]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
