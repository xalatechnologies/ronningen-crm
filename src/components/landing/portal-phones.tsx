"use client";

import {
  CalendarClock,
  ChevronRight,
  Check,
  House,
  ListChecks,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { BigBloom, Blossom, BotanicalSprig } from "@/components/brand/botanical";
import { BrandMark } from "@/components/brand/brand-logo";
import { ScaledScreen } from "@/components/landing/hero-film/scaled-screen";
import { ScheduleTimeline } from "@/components/portal/schedule-timeline";
import { WishStatusChip } from "@/components/portal/wish-status-chip";
import { APP_NAME } from "@/config/app";
import type { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export type PortalMock = ReturnType<typeof getDictionary>["landing"]["portal"]["mock"];

/** Design size of a phone screen: the real portal is drawn at this size, then scaled into the frame. */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 823;

const TAB_ICONS: LucideIcon[] = [House, Users, ListChecks, CalendarClock, MessageCircle];
const SCHEDULE_EMOJI = ["🥂", "🍽️", "🎤", "💃"] as const;

/** A phone showing one real portal screen (wedding theme, header and bottom navigation as in the product). */
export function PortalPhone({
  mock,
  activeTab,
  className,
  children,
}: {
  mock: PortalMock;
  activeTab: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative aspect-[9/18.5] w-[17rem] shrink-0 overflow-hidden rounded-[2.4rem] border-[7px] border-rn-text-heading bg-card shadow-2xl shadow-foreground/30",
        className,
      )}
    >
      <ScaledScreen width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        <div className="wedding-portal relative flex h-full flex-col overflow-hidden bg-background text-foreground">
          <BigBloom className="pointer-events-none absolute -right-24 top-40 size-80 text-primary/10" />
          <BigBloom className="pointer-events-none absolute -left-28 bottom-24 size-72 rotate-12 text-gold/20" />

          <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-gold/40 bg-gradient-to-b from-card/95 to-background/85 px-4">
            <span className="block size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-gold/50" style={{ "--brand-tile": "var(--primary)" } as CSSProperties}>
              <BrandMark />
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-serif text-base font-semibold">{mock.venue}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                <Blossom className="size-3 text-gold" filled />
                {APP_NAME}
              </span>
            </div>
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-4">{children}</div>

          <nav className="relative z-10 shrink-0 px-3 pb-3">
            <ul className="relative flex w-full rounded-full bg-card/90 p-1.5 shadow-rn-card ring-1 ring-gold/50">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/5)] rounded-full bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_65%,black)] shadow-md ring-1 ring-gold/60"
                style={{ transform: `translateX(${activeTab * 100}%)` }}
              />
              {mock.tabs.map((label, i) => {
                const Icon = TAB_ICONS[i]!;
                const active = i === activeTab;
                return (
                  <li
                    key={label}
                    className={cn(
                      "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] leading-tight font-semibold",
                      active ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-[1.375rem]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                    {label}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </ScaledScreen>
    </div>
  );
}

export function PortalOverviewScreen({ mock }: { mock: PortalMock }) {
  const steps = [
    { icon: Users, title: mock.step1, body: mock.step1Body, done: true, attention: false },
    { icon: ListChecks, title: mock.step2, body: mock.step2Body, done: false, attention: true },
    { icon: CalendarClock, title: mock.step3, body: mock.step3Body, done: false, attention: false },
  ];
  return (
    <>
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_65%,black)] p-5 text-primary-foreground shadow-rn-hero-success ring-1 ring-gold/50">
        <BotanicalSprig className="absolute -right-3 -top-2 h-40 w-32 text-primary-foreground/25" />
        <BotanicalSprig className="absolute -bottom-6 right-14 h-24 w-16 -rotate-12 text-gold/50" />
        <p className="relative text-app-sm font-semibold text-primary-foreground/85">{mock.greeting}</p>
        <p className="relative flex items-baseline gap-3">
          <span className="font-serif text-6xl leading-none font-semibold tracking-tight tabular-nums">{mock.countdown}</span>
          <span className="text-app-base font-semibold text-primary-foreground/85">{mock.countdownLabel}</span>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map(({ icon: Icon, title, body, done, attention }) => (
          <li key={title} className={cn("flex min-h-[4.5rem] items-center gap-4 rounded-2xl px-4 py-3 shadow-rn-card ring-1", done ? "bg-card/70 ring-gold/25" : "bg-card ring-gold/50")}>
            <span className={cn("relative flex size-12 shrink-0 items-center justify-center rounded-full", attention ? "bg-success text-white" : "bg-primary-soft text-success")}>
              <Icon className="size-5" aria-hidden />
              {done ? (
                <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-card text-gold ring-1 ring-gold/60">
                  <Blossom className="size-5" filled />
                </span>
              ) : (
                <span className="absolute -right-1 -bottom-1 size-6 rounded-full border-2 border-dashed border-gold bg-card" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-serif text-base font-semibold">{title}</span>
              <span className="text-app-sm text-muted-foreground">{body}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-gold" aria-hidden />
          </li>
        ))}
      </ul>
    </>
  );
}

export function PortalWishlistScreen({ mock }: { mock: PortalMock }) {
  return (
    <>
      <h2 className="px-1 font-serif text-2xl font-semibold">{mock.wishTitle}</h2>
      <ul className="flex flex-col gap-3">
        {mock.wishItems.map((item) => {
          const quoted = Boolean(item.price);
          return (
            <li key={item.name} className={cn("flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-rn-card ring-1", quoted ? "ring-2 ring-primary/60" : "ring-gold/40")}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-soft to-secondary text-success ring-1 ring-gold/50">
                  <ListChecks className="size-5" />
                </span>
                <h3 className="min-w-0 flex-1 font-serif text-lg leading-snug font-semibold">{item.name}</h3>
                <WishStatusChip status={quoted ? "quoted" : "requested"} />
              </div>
              {quoted ? (
                <div className="rounded-2xl bg-primary-soft p-3.5 ring-1 ring-gold/30">
                  <p className="font-serif text-2xl font-semibold tabular-nums">{item.price}</p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-baseline justify-between rounded-3xl bg-primary-soft px-5 py-4 ring-1 ring-gold/50">
        <p className="text-app-sm font-semibold text-muted-foreground">{mock.wishTotal}</p>
        <p className="font-serif text-2xl font-semibold tabular-nums">NOK 22 950</p>
      </div>
    </>
  );
}

export function PortalScheduleScreen({ mock }: { mock: PortalMock }) {
  const entries = mock.scheduleItems.map((item, i) => ({
    id: item.time,
    startTime: item.time,
    durationMin: 90,
    title: `${SCHEDULE_EMOJI[i] ?? ""} ${item.title}`.trim(),
    note: null,
    responsible: null,
  }));
  return (
    <>
      <h2 className="px-1 font-serif text-2xl font-semibold">{mock.scheduleTitle}</h2>
      <div className="flex items-center gap-2 rounded-2xl bg-gold/15 px-3.5 py-2.5 text-app-sm font-semibold ring-1 ring-gold/40">
        <Check className="size-4 text-success" strokeWidth={3} aria-hidden />
        {mock.shared}
      </div>
      <ScheduleTimeline entries={entries} />
    </>
  );
}
