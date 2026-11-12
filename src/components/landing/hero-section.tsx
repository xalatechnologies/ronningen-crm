"use client";

import { HeroDashboardPreview } from "@/components/landing/hero-dashboard-preview";
import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { APP_NAME } from "@/config/app";
import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const primaryCtaClass = cn(
  buttonVariants({ variant: "success", size: "cta" }),
  "w-full shadow-none sm:w-auto",
);

const secondaryCtaClass = cn(
  buttonVariants({ variant: "outline", size: "cta" }),
  "w-full border-0 bg-[#eef2f0] font-semibold shadow-none hover:bg-[#e3eae6] sm:w-auto",
);

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-hero-title"
      className={cn(
        "overflow-x-clip bg-background pt-10 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-32",
        LANDING_SECTION_X,
      )}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-8 md:gap-10">
          <div className="flex flex-col gap-5 md:gap-6">
            <h1
              id="landing-hero-title"
              className="max-w-[20ch] text-[clamp(38px,8vw,64px)] leading-[1.04] font-bold tracking-[-0.035em] text-[#0c1f16] lg:text-[clamp(44px,4.6vw,72px)]"
            >
              {t("landing.hero.headline")}
            </h1>
            <p className="landing-subhead max-w-[48ch] leading-relaxed">
              {t("landing.hero.subheadline", { appName: APP_NAME })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={LANDING_ROUTES.register} className={primaryCtaClass}>
              {t("landing.hero.primaryCta")}
            </Link>
            <a href="#funksjoner" className={secondaryCtaClass}>
              {t("landing.hero.secondaryCta")}
            </a>
          </div>

          <p className="max-w-[46ch] text-sm text-rn-text-slate">
            {t("landing.hero.trust")}
          </p>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>
  );
}
