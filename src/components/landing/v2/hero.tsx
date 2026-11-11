"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import { copyFor, langOf } from "@/components/landing/v2/content";
import { BookingFragment } from "@/components/landing/v2/fragments";
import { Reveal } from "@/components/landing/v2/reveal";
import { useTranslation } from "@/i18n/client";
import Link from "next/link";
import { useState } from "react";

export function Hero() {
  const { locale } = useTranslation();
  const copy = copyFor(locale);
  const [stage, setStage] = useState(0);

  return (
    <section
      aria-labelledby="lp-hero"
      className="lp-x grid content-center gap-10 py-10 xl:min-h-[min(calc(100svh-72px),560px)] xl:grid-cols-[1fr_minmax(460px,34vw)_1fr] xl:items-center xl:gap-10 xl:py-14"
    >
      <h1
        id="lp-hero"
        className="text-[clamp(36px,10vw,56px)] leading-[1.05] font-bold tracking-[-0.03em] text-[#0c1f16] xl:text-[clamp(36px,3.1vw,56px)]"
      >
        {copy.hero.left}
        <br />
        {copy.hero.right}
      </h1>

      <Reveal>
        <BookingFragment
          copy={copy}
          locale={langOf(locale)}
          stage={stage}
          onStage={setStage}
          className="max-w-none"
        />
      </Reveal>

      <div className="flex flex-col gap-5">
        <p className="max-w-[34ch] text-[18px] leading-[1.5] text-[#1a1c1a]">
          {copy.hero.sub}
        </p>
        <div className="flex flex-col items-start gap-3">
          <Link href={LANDING_ROUTES.register} className="lp-btn">
            {copy.hero.cta}
          </Link>
          <p className="max-w-[34ch] text-[15px] text-[#334155]">
            {copy.hero.trial}
          </p>
        </div>
      </div>
    </section>
  );
}
