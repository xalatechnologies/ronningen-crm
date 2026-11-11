"use client";

import { copyFor } from "@/components/landing/v2/content";
import { Reveal } from "@/components/landing/v2/reveal";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { useMemo } from "react";

export function Faq() {
  const { locale } = useTranslation();
  const copy = copyFor(locale);
  const items = useMemo(
    () => getDictionary(locale).landing.faq.items,
    [locale],
  );

  return (
    <section
      id="faq"
      aria-labelledby="lp-faq"
      className="lp-x grid gap-10 py-[clamp(72px,10vw,160px)] lg:grid-cols-12"
    >
      <h2
        id="lp-faq"
        className="text-[clamp(32px,9vw,44px)] leading-[1.05] font-bold tracking-[-0.03em] text-[#0c1f16] lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:text-[clamp(36px,4vw,64px)]"
      >
        {copy.faq.title}
      </h2>
      <div className="lp-faq flex flex-col gap-1.5 lg:col-span-8 lg:gap-2">
        {items.map((item, i) => (
          <Reveal key={item.question} delay={i * 50}>
            <details name="lp-faq">
              <summary>
                <span>{item.question}</span>
                <span className="lp-plus" aria-hidden />
              </summary>
              <p className="lp-answer">{item.answer}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
