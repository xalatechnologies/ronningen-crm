"use client";

import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

export function FaqSection() {
  const { t, locale } = useTranslation();
  const items = useMemo(() => getDictionary(locale).landing.faq.items, [locale]);

  return (
    <LandingSectionShell
      id="faq"
      titleId="landing-faq-title"
      title={t("landing.sections.faq")}
      description={t("landing.faq.description")}
    >
      <div className="overflow-hidden rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card">
        {items.map((item, index) => (
          <details
            key={item.question}
            className={cn(
              "group",
              index > 0 && "border-t-2 border-rn-border-strong/50",
            )}
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-heading text-base font-semibold text-rn-text-heading transition-colors marker:content-none hover:bg-rn-surface-wash/80 md:px-6 md:text-lg [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <ChevronDown
                className="size-5 shrink-0 text-success transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-rn-border-strong/40 bg-rn-surface-wash/60 px-5 py-4 md:px-6 md:py-5">
              <p className="border-l-4 border-success pl-4 text-sm leading-relaxed text-rn-text-slate md:text-base">
                {item.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </LandingSectionShell>
  );
}
