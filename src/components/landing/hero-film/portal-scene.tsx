"use client";

import { CalendarClock, CalendarDays, ChevronRight, House, ListChecks, MessageCircle, Users } from "lucide-react";

import type { HeroFilmCopy } from "@/components/landing/hero-film/film-clock";
import { BigBloom, Blossom, BotanicalSprig } from "@/components/brand/botanical";
import { BrandMark } from "@/components/brand/brand-logo";
import { APP_NAME } from "@/config/app";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The customer portal home, in its wedding theme, built from the same classes as the real portal. */
export function PortalScene({ sample }: { sample: HeroFilmCopy["sample"] }) {
  const { t } = useTranslation();
  const tabs = [
    { label: t("portal.nav.overview"), icon: House },
    { label: t("portal.nav.guests"), icon: Users },
    { label: t("portal.nav.wishlist"), icon: ListChecks },
    { label: t("portal.nav.schedule"), icon: CalendarClock },
    { label: t("portal.nav.messages"), icon: MessageCircle },
  ];
  const steps = [
    { icon: MessageCircle, title: t("portal.home.messageUnreadTitle"), body: t("portal.home.messageUnreadBody", { count: 1 }), attention: true },
    { icon: Users, title: t("portal.home.guestsCardTitle"), body: t("portal.home.guestsCardCount", { count: 84 }), done: true },
    { icon: CalendarClock, title: t("portal.home.scheduleCardTitle"), body: t("portal.home.scheduleCardBody") },
    { icon: ListChecks, title: t("portal.home.wishCardTitle"), body: t("portal.home.wishCardBody") },
  ];

  return (
    <div className="wedding-portal relative flex h-full flex-col overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <BigBloom className="absolute -right-16 top-40 size-[26rem] text-primary/10" />
        <BigBloom className="absolute -left-20 bottom-24 size-96 rotate-12 text-gold/20" />
      </div>

      <header className="relative z-10 border-b border-gold/40 bg-gradient-to-b from-card/95 to-background/85">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <span className="block size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-gold/50" style={{ "--brand-tile": "var(--primary)" } as React.CSSProperties}>
              <BrandMark />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-lg font-semibold">{sample.org}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                <Blossom className="size-3 text-gold" filled />
                {APP_NAME}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-card px-3 py-2 text-app-sm font-semibold ring-1 ring-gold/50">{t("portal.nav.logout")}</span>
        </div>
      </header>

      <nav className="relative z-10 border-b border-gold/40 bg-background">
        <ul className="mx-auto flex w-full max-w-6xl gap-1 px-8 py-2">
          {tabs.map((tab, i) => (
            <li
              key={tab.label}
              className={cn("flex min-h-10 items-center gap-2 rounded-full px-4 text-[15px] font-semibold", i === 0 ? "bg-success/12 text-success" : "text-muted-foreground")}
            >
              <tab.icon className="size-[1.125rem]" strokeWidth={i === 0 ? 2.2 : 1.8} aria-hidden />
              {tab.label}
            </li>
          ))}
        </ul>
      </nav>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-8 py-6">
        <header className="film-rise relative flex flex-col gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_65%,black)] p-7 text-primary-foreground shadow-rn-hero-success ring-1 ring-gold/50">
          <BotanicalSprig className="absolute -right-3 -top-2 h-52 w-40 text-primary-foreground/25" />
          <BotanicalSprig className="absolute -bottom-6 right-16 h-28 w-20 -rotate-12 text-gold/50" />
          <p className="relative text-app-sm font-semibold text-primary-foreground/85">{t("portal.home.greeting", { name: sample.firstName })}</p>
          <p className="relative flex items-baseline gap-3">
            <span className="font-serif text-7xl leading-none font-semibold tracking-tight tabular-nums">205</span>
            <span className="text-app-base font-semibold text-primary-foreground/85">{t("portal.home.countdownLabel")}</span>
          </p>
          <ul className="relative flex gap-2 text-app-sm font-medium">
            <li className="flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {t("portal.home.eventOn", { type: sample.eventType, date: sample.fullDate }).trim()}
            </li>
            <li className="flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1.5">
              <Users className="size-4" aria-hidden />
              {t("portal.home.guests", { count: 120 })}
            </li>
          </ul>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,19rem)_1fr] items-start gap-5">
          <div className="film-rise relative flex items-center gap-4 overflow-hidden rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40" style={{ animationDelay: "350ms" }}>
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" className="stroke-primary/12" />
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-primary" strokeDasharray="131.9 263.9" />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <Blossom className="size-5 text-gold" filled />
                <span className="font-serif text-2xl leading-none font-semibold tabular-nums">50%</span>
              </span>
            </div>
            <h2 className="font-serif text-xl leading-tight font-semibold">{t("portal.home.nextTitle")}</h2>
          </div>

          <ul className="flex flex-col gap-3">
            {steps.map(({ icon: Icon, title, body, attention, done }, i) => (
              <li
                key={title}
                className={cn("film-rise flex min-h-[4.5rem] items-center gap-4 rounded-2xl px-4 py-3 shadow-rn-card ring-1", done ? "bg-card/70 ring-gold/25" : "bg-card ring-gold/50")}
                style={{ animationDelay: `${600 + i * 260}ms` }}
              >
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
        </section>
      </main>
    </div>
  );
}
