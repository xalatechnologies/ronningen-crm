"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export function FinalCtaSection() {
  const { t, locale } = useTranslation();
  const demo = useMemo(() => getDictionary(locale).landing.heroDemo, [locale]);
  const booking = demo.bookings[0];

  return (
    <section
      aria-labelledby="landing-final-cta-title"
      className={cn(LANDING_SECTION_X, "pb-16 md:pb-24 lg:pb-32")}
    >
      <div
        className={cn(
          LANDING_CONTAINER,
          "grid gap-10 overflow-hidden rounded-3xl bg-[#0c1f16] px-6 py-12 text-white sm:px-10 md:py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center lg:gap-16 lg:px-16 lg:py-24",
        )}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2
              id="landing-final-cta-title"
              className="max-w-[22ch] text-[clamp(30px,4.6vw,56px)] leading-[1.06] font-bold tracking-[-0.03em] !text-white"
            >
              {t("landing.finalCta.title")}
            </h2>
            <p className="max-w-[48ch] text-lg leading-relaxed text-[#b9d3c4]">
              {t("landing.finalCta.text")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={LANDING_ROUTES.register}
              className="inline-flex h-14 items-center justify-center rounded-xl bg-white px-7 font-heading text-base font-bold text-[#1a4331] transition-colors hover:bg-[#e8f5ee]"
            >
              {t("landing.finalCta.primaryCta")}
            </Link>
            <Link
              href={LANDING_ROUTES.login}
              className="inline-flex h-14 items-center justify-center rounded-xl bg-white/10 px-7 font-heading text-base font-semibold text-white transition-colors hover:bg-white/15"
            >
              {t("landing.finalCta.secondaryCta")}
            </Link>
          </div>
        </div>

        <div
          className="hidden items-center gap-4 rounded-2xl bg-white p-5 text-[#1a1c1a] lg:flex"
          aria-hidden
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1a4331] text-white">
            <CheckIcon className="size-6" strokeWidth={2.5} />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold">
              {booking.event} · {booking.date}
            </span>
            <span className="mt-1 block text-sm text-[#475569]">
              {statusLabel(booking.statusKey, t)} · {demo.stats[2].value}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
