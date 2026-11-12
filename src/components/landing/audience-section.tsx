"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  Building2,
  Heart,
  KeyRound,
  Landmark,
  Ticket,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

// Same order as the dictionary items: wedding, party, community hall, event, owners, rental.
const AUDIENCE_ICONS: LucideIcon[] = [
  Heart,
  Wine,
  Landmark,
  Ticket,
  Building2,
  KeyRound,
];

export function AudienceSection() {
  const { t, locale } = useTranslation();
  const items = useMemo(
    () => getDictionary(locale).landing.audience.items,
    [locale],
  );

  return (
    <section
      aria-labelledby="landing-audience-title"
      className={cn(LANDING_SECTION_X, "bg-[#eef2f0] py-16 md:py-24 lg:py-32")}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-12 lg:gap-16")}>
        <h2
          id="landing-audience-title"
          className="max-w-[24ch] text-[clamp(32px,5.4vw,68px)] leading-[1.04] font-bold tracking-[-0.035em] text-[#0c1f16]"
        >
          {t("landing.sections.audience")}
        </h2>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {items.map((item, index) => {
            const Icon = AUDIENCE_ICONS[index]!;
            return (
              <li
                key={item}
                className="group flex min-h-44 flex-col justify-between gap-10 rounded-2xl bg-white p-6 transition-colors duration-200 hover:bg-[#1a4331] md:min-h-56 md:p-8"
              >
                <Icon
                  className="size-8 text-[#1a4331] transition-colors duration-200 group-hover:text-[#85b098]"
                  aria-hidden
                />
                <p className="font-heading text-[clamp(24px,2.6vw,36px)] leading-[1.1] font-semibold tracking-[-0.02em] text-[#0c1f16] transition-colors duration-200 group-hover:text-white">
                  {item}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
