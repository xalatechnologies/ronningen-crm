"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const primaryCtaClass = cn(
  buttonVariants({ variant: "outline", size: "cta" }),
  "w-full border-2 border-white bg-white font-heading font-bold !text-success shadow-rn-hero-success hover:bg-primary-soft hover:!text-success sm:w-auto",
);

const secondaryCtaClass = cn(
  buttonVariants({ variant: "outline", size: "cta" }),
  "w-full border-2 border-white/50 bg-transparent font-heading font-semibold !text-white shadow-sm hover:bg-white/10 hover:!text-white sm:w-auto",
);

export function FinalCtaSection() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="landing-final-cta-title"
      className={cn(
        LANDING_SECTION_X,
        "border-t-2 border-rn-accent-border bg-success py-16 text-white md:py-24",
      )}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "flex flex-col items-center gap-6 px-6 py-10 text-center md:gap-8 md:px-12 md:py-14",
        )}
      >
        <div className="flex max-w-3xl flex-col gap-3">
          <h2
            id="landing-final-cta-title"
            className="font-heading text-2xl font-bold tracking-tight text-white md:text-3xl"
          >
            {t("landing.finalCta.title")}
          </h2>
          <p className="text-base leading-relaxed text-primary-light md:text-lg">
            {t("landing.finalCta.text")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
          <Link href={LANDING_ROUTES.register} className={primaryCtaClass}>
            {t("landing.finalCta.primaryCta")}
          </Link>
          <Link href={LANDING_ROUTES.login} className={secondaryCtaClass}>
            {t("landing.finalCta.secondaryCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
