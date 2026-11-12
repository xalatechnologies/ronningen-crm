"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  Check,
  LayoutDashboard,
  Layers,
  Package,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const BENEFIT_ICONS: LucideIcon[] = [
  LayoutDashboard,
  Wallet,
  Users,
  Package,
  TrendingUp,
  Layers,
];

const PRICE_EX_VAT = 500;
const VAT_RATE = 0.25;
const VAT_AMOUNT = PRICE_EX_VAT * VAT_RATE;

function kr(amount: number) {
  return `kr ${amount.toLocaleString("nb-NO")}`;
}

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
      className={cn(LANDING_SECTION_X, "py-16 md:py-24")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch lg:gap-12",
        )}
      >
        <div className="flex flex-col gap-8">
          <h2
            id="landing-benefits-pricing-title"
            className="max-w-[20ch] text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
          >
            {t("landing.sections.benefits")}
          </h2>

          <ul className="grid gap-3 sm:grid-cols-2">
            {benefits.items.map((benefit, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length]!;
              return (
                <li
                  key={benefit}
                  className="flex items-start gap-3.5 rounded-2xl bg-[#eef2f0] p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1a4331] text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="pt-0.5 text-[15px] leading-snug font-medium text-[#1a1c1a]">
                    {benefit}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <article className="flex flex-col gap-6 rounded-3xl bg-[#1a4331] p-7 text-white md:p-9">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-2xl font-semibold !text-white">
                {benefits.planName}
              </h3>
              <p className="text-[15px] leading-relaxed text-[#d6e6dc]">
                {benefits.planDescription}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[#85b098] px-3 py-1 text-xs font-semibold text-[#0c1f16]">
              {t("landing.pricing.trial")}
            </span>
          </div>

          <p className="flex flex-wrap items-baseline gap-x-2 font-heading font-bold tracking-tight">
            <span className="text-[clamp(56px,7vw,80px)] leading-none">
              {PRICE_EX_VAT}
            </span>
            <span className="text-lg font-semibold text-[#b9d3c4]">
              {t("landing.pricing.perMonth")} {t("landing.pricing.exVat")}
            </span>
          </p>

          <dl className="divide-y divide-white/10 rounded-2xl bg-white/8 px-4 text-[15px]">
            <div className="flex items-center justify-between py-3">
              <dt className="text-[#d6e6dc]">{t("landing.pricing.priceExVat")}</dt>
              <dd className="font-semibold tabular-nums">{kr(PRICE_EX_VAT)}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-[#d6e6dc]">{t("landing.pricing.vat")}</dt>
              <dd className="font-semibold tabular-nums">{kr(VAT_AMOUNT)}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="font-semibold">{t("landing.pricing.totalIncVat")}</dt>
              <dd className="font-heading text-lg font-bold tabular-nums">
                {kr(PRICE_EX_VAT + VAT_AMOUNT)}
              </dd>
            </div>
          </dl>

          <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-[#d6e6dc]">
            <Check className="mt-1 size-4 shrink-0 text-[#85b098]" strokeWidth={3} aria-hidden />
            {t("landing.pricing.sectionDescription")}
          </p>

          <div className="mt-auto flex flex-col gap-3">
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
