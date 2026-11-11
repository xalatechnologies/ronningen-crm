"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useMemo } from "react";

export function FaqSection() {
  const { t, locale } = useTranslation();
  const items = useMemo(() => getDictionary(locale).landing.faq.items, [locale]);

  return (
    <section
      id="faq"
      aria-labelledby="landing-faq-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          <h2
            id="landing-faq-title"
            className="max-w-[14ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
          >
            {t("landing.sections.faq")}
          </h2>
          <p className="landing-subhead max-w-[40ch]">
            {t("landing.faq.description")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <details
              key={item.question}
              name="landing-faq"
              className="group rounded-2xl bg-[#eef2f0] transition-colors open:bg-[#e8f5ee]"
              open={index === 0}
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading text-base font-semibold text-[#0c1f16] marker:content-none md:px-7 md:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <Plus
                  className="size-5 shrink-0 text-[#1a4331] transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="max-w-[62ch] px-5 pb-6 text-base leading-relaxed text-[#334155] md:px-7">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
