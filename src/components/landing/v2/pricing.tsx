"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import { copyFor } from "@/components/landing/v2/content";
import { StatusPill } from "@/components/landing/v2/fragments";
import { Reveal } from "@/components/landing/v2/reveal";
import { useTranslation } from "@/i18n/client";
import Link from "next/link";

export function Pricing() {
  const { locale } = useTranslation();
  const copy = copyFor(locale);
  const p = copy.pricing;

  return (
    <section
      id="priser"
      aria-labelledby="lp-pricing"
      className="lp-x grid min-h-[80svh] gap-10 py-[clamp(72px,10vw,160px)] lg:grid-cols-12 lg:items-center"
    >
      <div className="lg:col-span-4 lg:self-start">
        <Reveal as="h2">
          <span
            id="lp-pricing"
            className="block text-[clamp(30px,3vw,40px)] leading-[1.1] font-bold tracking-[-0.025em] text-[#0c1f16]"
          >
            {p.title}
          </span>
        </Reveal>
        <Reveal as="p" delay={80} className="mt-4 max-w-[34ch] text-[17px] leading-[1.55]">
          {p.text}
        </Reveal>
      </div>

      <div className="lg:col-span-7 lg:col-start-6">
        <div className="relative">
          <Reveal delay={60}>
            <p
              className="flex items-start leading-[0.85] font-bold tracking-[-0.05em] text-[#0c1f16] tabular-nums"
              aria-label={`500 kr ${p.period}`}
            >
              <span
                aria-hidden
                className="text-[clamp(48px,8vw,120px)] leading-[0.85]"
              >
                kr
              </span>
              <span
                aria-hidden
                className="text-[clamp(104px,16vw,240px)]"
              >
                500
              </span>
              <span
                aria-hidden
                className="hidden self-end pb-[0.4em] pl-3 text-[18px] leading-none font-medium tracking-normal sm:block"
              >
                {p.period}
              </span>
            </p>
            <p aria-hidden className="mt-2 text-[18px] sm:hidden">
              {p.period}
            </p>
          </Reveal>

          <div
            data-ui
            className="mt-6 w-[260px] rounded-[12px] bg-white p-4 text-[14px] ring-1 ring-[#dfe6e2] sm:absolute sm:top-0 sm:right-0 sm:mt-0 sm:-translate-y-[12%]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">
                {copy.fragments.invoiceNo} 2024-0147
              </p>
              <StatusPill status="paid" label={copy.fragments.status.paid} />
            </div>
            <p className="mt-1 text-[13px] text-[#475569]">
              {copy.booking.outstanding}: 0 kr
            </p>
          </div>
        </div>

        <ul className="mt-10 flex flex-col gap-1 text-[18px] leading-[1.5]">
          {p.included.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Link href={LANDING_ROUTES.register} className="lp-btn self-start">
            {p.cta}
          </Link>
          <p className="max-w-[52ch] text-[15px] text-[#334155]">{p.trial}</p>
        </div>
      </div>
    </section>
  );
}
