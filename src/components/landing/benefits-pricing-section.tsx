"use client";

import {
  BarChart3,
  BedDouble,
  CalendarCheck,
  Check,
  FileSignature,
  MessagesSquare,
  Package,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import { LANDING_CONTAINER, LANDING_SECTION_X } from "@/components/landing/landing-layout";
import { BILLING_PLANS } from "@/config/billing-plans";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

const GROUP_ICONS: LucideIcon[] = [CalendarCheck, Users, Package, Wallet, FileSignature, MessagesSquare, BedDouble, BarChart3];

const PRICE_EX_VAT = BILLING_PLANS.standard.displayPriceNok;
const VAT_RATE = 0.25;
const VAT_AMOUNT = PRICE_EX_VAT * VAT_RATE;

function kr(amount: number) {
  return `kr ${amount.toLocaleString("nb-NO", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 })}`;
}

export function BenefitsPricingSection() {
  const { t, locale } = useTranslation();
  const showDevDisclaimer = process.env.NODE_ENV === "development";
  const benefits = useMemo(() => getDictionary(locale).landing.benefits, [locale]);

  return (
    <section id="priser" aria-labelledby="landing-benefits-pricing-title" className={cn(LANDING_SECTION_X, "py-16 md:py-24")}>
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-12")}>
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="w-fit rounded-full bg-success px-3 py-1 text-[13px] font-semibold text-white">{benefits.eyebrow}</span>
          <h2 id="landing-benefits-pricing-title" className="text-[clamp(30px,5vw,52px)] leading-[1.06] font-bold tracking-[-0.03em] text-rn-text-heading">
            {t("landing.sections.pricing")}
          </h2>
          <p className="max-w-[56ch] text-base leading-relaxed text-rn-text-slate">{benefits.includedLead}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-5">
            <h3 className="font-heading text-xl font-semibold tracking-tight text-rn-text-heading">{benefits.includedTitle}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {benefits.groups.map((group, i) => {
                const Icon = GROUP_ICONS[i % GROUP_ICONS.length]!;
                return (
                  <li key={group.title} className="flex flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <h4 className="font-heading text-base font-semibold text-rn-text-heading">{group.title}</h4>
                    </div>
                    <p className="text-[15px] leading-relaxed text-rn-text-slate">{group.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>

          <article className="flex flex-col gap-6 rounded-3xl bg-success p-7 text-white md:p-9 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <h3 className="font-heading text-3xl font-bold tracking-tight !text-white">{benefits.planName}</h3>
                <p className="text-[15px] leading-relaxed text-white/85">{benefits.planDescription}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">{t("landing.pricing.trial")}</span>
            </div>

            <p className="flex flex-wrap items-baseline gap-x-2 font-heading font-bold tracking-tight">
              <span className="text-[clamp(56px,7vw,80px)] leading-none">{PRICE_EX_VAT}</span>
              <span className="text-lg font-semibold text-white/80">
                {t("landing.pricing.perMonth")} {t("landing.pricing.exVat")}
              </span>
            </p>

            <dl className="divide-y divide-white/15 rounded-2xl bg-white/10 px-4 text-[15px]">
              <div className="flex items-center justify-between py-3">
                <dt className="text-white/85">{t("landing.pricing.priceExVat")}</dt>
                <dd className="font-semibold tabular-nums">{kr(PRICE_EX_VAT)}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-white/85">{t("landing.pricing.vat")}</dt>
                <dd className="font-semibold tabular-nums">{kr(VAT_AMOUNT)}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="font-semibold">{t("landing.pricing.totalIncVat")}</dt>
                <dd className="font-heading text-lg font-bold tabular-nums">{kr(PRICE_EX_VAT + VAT_AMOUNT)}</dd>
              </div>
            </dl>

            <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-white/90">
              {[t("landing.pricing.sectionDescription"), ...benefits.assurances].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Check className="mt-1 size-4 shrink-0 text-white" strokeWidth={3} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3">
              <Link
                href={LANDING_ROUTES.register}
                className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-white px-6 font-heading text-base font-bold text-success transition-colors hover:bg-white/90"
              >
                {t("landing.hero.primaryCta")}
              </Link>
              {showDevDisclaimer ? <p className="text-center text-xs leading-relaxed text-white/75">{t("landing.pricing.disclaimerDev")}</p> : null}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
