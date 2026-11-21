"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import {
  PortalOverviewScreen,
  PortalPhone,
  PortalScheduleScreen,
  PortalWishlistScreen,
} from "@/components/landing/portal-phones";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  CalendarClockIcon,
  ListChecksIcon,
  MailIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useMemo } from "react";

const FEATURE_ICONS = [MailIcon, ListChecksIcon, CalendarClockIcon, MessageCircleIcon];

export function PortalSection() {
  const { t, locale } = useTranslation();
  const portal = useMemo(() => getDictionary(locale).landing.portal, [locale]);

  return (
    <section
      id="kundeportal"
      aria-labelledby="landing-portal-title"
      className={cn(LANDING_SECTION_X, "bg-[#eef2f0] py-16 md:py-24")}
    >
      <div className={cn(LANDING_CONTAINER, "grid items-center gap-12 lg:grid-cols-12 lg:gap-8")}>
        <div className="flex flex-col gap-8 lg:col-span-5">
          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full bg-[#3d62cf] px-3 py-1 text-[13px] font-semibold text-white">{portal.eyebrow}</span>
            <h2
              id="landing-portal-title"
              className="text-[clamp(30px,4.4vw,48px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#13233a]"
            >
              {t("landing.portal.title")}
            </h2>
            <p className="max-w-[52ch] text-base leading-relaxed text-[#475569]">{portal.lead}</p>
          </div>

          <ul className="flex flex-col gap-4">
            {portal.features.map(({ title, text }, index) => {
              const Icon = FEATURE_ICONS[index]!;
              return (
                <li key={title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#3d62cf] text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-heading text-lg font-semibold tracking-tight text-[#13233a]">{title}</h3>
                    <p className="text-[15px] leading-relaxed text-[#475569]">{text}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 text-[14px] text-[#475569]">
            <p className="flex items-start gap-2.5">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#3d62cf]" aria-hidden />
              {portal.control}
            </p>
            <p className="flex items-start gap-2.5">
              <SmartphoneIcon className="mt-0.5 size-4 shrink-0 text-[#3d62cf]" aria-hidden />
              {portal.app}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:col-span-7">
          <div className="relative flex items-center justify-center">
            <PortalPhone mock={portal.mock} activeTab={0} className="hidden -mr-10 scale-[0.92] -rotate-2 xl:block">
              <PortalOverviewScreen mock={portal.mock} />
            </PortalPhone>
            <PortalPhone mock={portal.mock} activeTab={2} className="z-10">
              <PortalWishlistScreen mock={portal.mock} />
            </PortalPhone>
            <PortalPhone mock={portal.mock} activeTab={3} className="-ml-10 hidden scale-[0.92] rotate-2 md:block">
              <PortalScheduleScreen mock={portal.mock} />
            </PortalPhone>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-12">
          <h3 className="font-heading text-xl font-semibold tracking-tight text-[#13233a]">{portal.stepsTitle}</h3>
          <ol className="grid gap-4 md:grid-cols-3">
            {portal.steps.map(({ title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/[0.05]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#3d62cf] font-heading text-base font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="font-heading text-base font-semibold text-[#13233a]">{title}</h4>
                  <p className="text-[15px] leading-relaxed text-[#475569]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
