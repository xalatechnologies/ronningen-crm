"use client";

import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  HouseIcon,
  ListChecksIcon,
  MailIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

const FEATURE_ICONS = [MailIcon, ListChecksIcon, CalendarClockIcon, MessageCircleIcon];
const TAB_ICONS = [HouseIcon, UsersIcon, ListChecksIcon, CalendarClockIcon, MessageCircleIcon];

type Mock = ReturnType<typeof getDictionary>["landing"]["portal"]["mock"];

/** A phone drawn in HTML so the section shows the real portal layout without real customer data. */
function Phone({
  mock,
  activeTab,
  className,
  children,
}: {
  mock: Mock;
  activeTab: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex aspect-[9/18.5] w-[17rem] shrink-0 flex-col overflow-hidden rounded-[2.4rem] border-[7px] border-[#0c1f16] bg-[#fafaf6] shadow-[0_30px_60px_-20px_rgba(12,31,22,0.45)]",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-end gap-2 border-b border-black/[0.06] px-4 pb-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-[#0c1f16] text-[9px] font-bold text-white">E</span>
        <span className="truncate text-[12px] font-semibold text-[#0c1f16]">{mock.venue}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3.5">{children}</div>
      <div className="flex h-12 shrink-0 items-center justify-around border-t border-black/[0.08] bg-white/80 px-1">
        {mock.tabs.map((label, i) => {
          const Icon = TAB_ICONS[i]!;
          const active = i === activeTab;
          return (
            <span key={label} className="flex flex-col items-center gap-0.5">
              <span className={cn("flex h-5 w-9 items-center justify-center rounded-full", active && "bg-[#1a4331]/20 text-[#1a4331]", !active && "text-[#6b726d]")}>
                <Icon className="size-3.5" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span className={cn("text-[7px] font-semibold", active ? "text-[#0c1f16]" : "text-[#6b726d]")}>{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function OverviewScreen({ mock }: { mock: Mock }) {
  const steps = [
    { Icon: UsersIcon, title: mock.step1, body: mock.step1Body, done: true },
    { Icon: ListChecksIcon, title: mock.step2, body: mock.step2Body, attention: true },
    { Icon: CalendarClockIcon, title: mock.step3, body: mock.step3Body },
  ];
  return (
    <>
      <div className="flex flex-col gap-1.5 rounded-2xl bg-[#1a4331] p-3.5 text-white">
        <span className="text-[9px] font-semibold text-white/70">{mock.greeting}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-heading text-[2.4rem] font-bold leading-none tabular-nums">{mock.countdown}</span>
          <span className="text-[10px] font-semibold text-white/85">{mock.countdownLabel}</span>
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-black/[0.06] overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06]">
        {steps.map(({ Icon, title, body, done, attention }) => (
          <li key={title} className="flex items-center gap-2.5 px-2.5 py-2.5">
            <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full", attention ? "bg-[#1a4331] text-white" : "bg-[#1a4331]/12 text-[#1a4331]")}>
              <Icon className="size-3.5" />
              {done ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#1a4331] text-white ring-2 ring-white">
                  <CheckIcon className="size-2" strokeWidth={4} />
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[10px] font-semibold text-[#0c1f16]">{title}</span>
              <span className="line-clamp-2 text-[8.5px] leading-snug text-[#5b635e]">{body}</span>
            </span>
            <ChevronRightIcon className="size-3 shrink-0 text-[#8a918c]" />
          </li>
        ))}
      </ul>
    </>
  );
}

function WishlistScreen({ mock }: { mock: Mock }) {
  return (
    <>
      <span className="px-0.5 font-heading text-[15px] font-bold text-[#0c1f16]">{mock.wishTitle}</span>
      <ul className="flex flex-col gap-2">
        {mock.wishItems.map((item) => {
          const quoted = Boolean(item.price);
          return (
            <li key={item.name} className="flex flex-col gap-1.5 rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#0c1f16]">{item.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[8px] font-bold", quoted ? "bg-[#1a4331] text-white" : "bg-black/[0.06] text-[#5b635e]")}>{item.chip}</span>
              </span>
              {quoted ? <span className="font-heading text-[13px] font-bold tabular-nums text-[#0c1f16]">{item.price}</span> : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between rounded-xl bg-[#1a4331] px-3 py-2.5 text-white">
        <span className="text-[9px] font-semibold text-white/80">{mock.wishTotal}</span>
        <span className="font-heading text-[13px] font-bold tabular-nums">NOK 22 950</span>
      </div>
    </>
  );
}

function ScheduleScreen({ mock }: { mock: Mock }) {
  return (
    <>
      <span className="px-0.5 font-heading text-[15px] font-bold text-[#0c1f16]">{mock.scheduleTitle}</span>
      <div className="flex items-center gap-1.5 rounded-xl bg-[#1a4331]/10 px-2.5 py-2 text-[9px] font-semibold text-[#1a4331]">
        <CheckIcon className="size-3" strokeWidth={3} />
        {mock.shared}
      </div>
      <ol className="flex flex-col">
        {mock.scheduleItems.map((item, i) => (
          <li key={item.time} className="grid grid-cols-[2rem_0.75rem_1fr] gap-x-2">
            <span className="pt-2.5 font-heading text-[11px] font-bold tabular-nums text-[#0c1f16]">{item.time}</span>
            <span className="relative flex justify-center">
              <span className={cn("absolute w-px bg-black/15", i === 0 ? "top-3.5" : "top-0", i === mock.scheduleItems.length - 1 ? "h-3.5" : "bottom-0")} />
              <span className="relative mt-3 size-2 rounded-full bg-[#1a4331] ring-[3px] ring-[#fafaf6]" />
            </span>
            <span className="mb-2 rounded-xl bg-white px-2.5 py-2 text-[10px] font-semibold text-[#0c1f16] ring-1 ring-black/[0.06]">{item.title}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

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
            <span className="w-fit rounded-full bg-[#1a4331] px-3 py-1 text-[13px] font-semibold text-white">{portal.eyebrow}</span>
            <h2
              id="landing-portal-title"
              className="text-[clamp(30px,4.4vw,48px)] leading-[1.06] font-bold tracking-[-0.03em] text-[#0c1f16]"
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
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1a4331] text-white">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="font-heading text-lg font-semibold tracking-tight text-[#0c1f16]">{title}</h3>
                    <p className="text-[15px] leading-relaxed text-[#475569]">{text}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2 text-[14px] text-[#475569]">
            <p className="flex items-start gap-2.5">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#1a4331]" aria-hidden />
              {portal.control}
            </p>
            <p className="flex items-start gap-2.5">
              <SmartphoneIcon className="mt-0.5 size-4 shrink-0 text-[#1a4331]" aria-hidden />
              {portal.app}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:col-span-7">
          <div className="relative flex items-center justify-center">
            <Phone mock={portal.mock} activeTab={0} className="hidden -mr-10 scale-[0.92] -rotate-2 xl:flex">
              <OverviewScreen mock={portal.mock} />
            </Phone>
            <Phone mock={portal.mock} activeTab={2} className="z-10">
              <WishlistScreen mock={portal.mock} />
            </Phone>
            <Phone mock={portal.mock} activeTab={3} className="-ml-10 hidden scale-[0.92] rotate-2 md:flex">
              <ScheduleScreen mock={portal.mock} />
            </Phone>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-12">
          <h3 className="font-heading text-xl font-semibold tracking-tight text-[#0c1f16]">{portal.stepsTitle}</h3>
          <ol className="grid gap-4 md:grid-cols-3">
            {portal.steps.map(({ title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/[0.05]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1a4331] font-heading text-base font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h4 className="font-heading text-base font-semibold text-[#0c1f16]">{title}</h4>
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
