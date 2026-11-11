"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function BenefitsPricingSection() {
  const { t, locale } = useTranslation();
  const showDevDisclaimer = process.env.NODE_ENV === "development";
  const benefits = useMemo(
    () => getDictionary(locale).landing.benefits,
    [locale],
  );

  return (
    <section
      id="priser"
      aria-labelledby="landing-benefits-pricing-title"
      className={cn(LANDING_SECTION_X, "py-16 md:py-24 lg:py-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-10">
          <h2
            id="landing-benefits-pricing-title"
            className="max-w-[20ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
          >
            {t("landing.sections.benefits")}
          </h2>

          <div className="flex flex-col gap-5">
            <p className="font-heading text-lg font-semibold text-[#0c1f16]">
              {benefits.whatYouGet}
            </p>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {benefits.items.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 text-base leading-snug text-[#1a1c1a]"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-[#1a4331]">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <article className="flex flex-col gap-8 rounded-3xl bg-[#1a4331] p-7 text-white md:p-10">
          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-2xl font-semibold !text-white">
              {benefits.planName}
            </h3>
            <p className="text-base leading-relaxed text-[#d6e6dc]">
              {benefits.planDescription}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="flex items-baseline gap-2 font-heading font-bold tracking-tight">
              <span className="text-[clamp(64px,8vw,96px)] leading-none">
                500
              </span>
              <span className="text-lg font-semibold text-[#b9d3c4]">
                {t("landing.pricing.perMonth")}
              </span>
            </p>
            <p className="w-fit rounded-full bg-white/12 px-3.5 py-1.5 text-sm font-medium text-white">
              {t("landing.pricing.trial")}
            </p>
          </div>

          <p className="text-base leading-relaxed text-[#d6e6dc]">
            {t("landing.pricing.sectionDescription")}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href={LANDING_ROUTES.register}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-white px-6 font-heading text-base font-bold text-[#1a4331] transition-colors hover:bg-[#e8f5ee]"
            >
              {t("landing.hero.primaryCta")}
            </Link>
            {showDevDisclaimer ? (
              <p className="text-center text-xs leading-relaxed text-[#b9d3c4]">
                {t("landing.pricing.disclaimerDev")}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
