import { CalendarClock, CalendarDays, ChevronRight, ListChecks, MessageCircle, Users } from "lucide-react";
import Link from "next/link";

import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { countUnread } from "@/lib/portal/messages";
import { countWishAttention } from "@/lib/portal/wishlist";
import { countGuests } from "@/lib/portal/guests";
import { listScheduleItems, listScheduleVersions, scheduleContentHash } from "@/lib/portal/schedule";
import { todayInOslo } from "@/lib/portal/rsvp-rules";
import { shareState } from "@/lib/portal/schedule-rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Blossom, BotanicalSprig } from "@/components/brand/botanical";

export const dynamic = "force-dynamic";

function daysUntil(isoDate: string): number {
  const [ty, tm, td] = todayInOslo().split("-").map(Number);
  const start = Date.UTC(ty, tm - 1, td);
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000);
}

export default async function PortalHomePage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t, formatDate } = await getServerTranslation();

  const supabase = await createServerSupabaseClient();
  const [unread, wishes, entries, versions, guestCount] = await Promise.all([
    countUnread(supabase, ctx.booking.id, "customer"),
    countWishAttention(supabase, ctx.booking.id),
    listScheduleItems(supabase, ctx.booking.id),
    listScheduleVersions(supabase, ctx.booking.id),
    countGuests(supabase, ctx.booking.id),
  ]);
  const latestVersion = versions[0] ?? null;
  const plan = shareState({
    itemCount: entries.length,
    currentHash: scheduleContentHash(entries),
    latest: latestVersion
      ? { version: latestVersion.version, contentHash: latestVersion.contentHash, acknowledged: Boolean(latestVersion.acknowledgedAt) }
      : null,
  });
  const days = ctx.booking.eventDate ? daysUntil(ctx.booking.eventDate) : null;
  const countdown =
    days == null || days > 1
      ? null
      : days === 1
        ? t("portal.home.countdownTomorrow")
        : days === 0
          ? t("portal.home.countdownToday")
          : t("portal.home.countdownPast");

  const steps = [
    {
      href: "/portal/guests",
      icon: Users,
      title: t("portal.home.guestsCardTitle"),
      body: guestCount > 0 ? t("portal.home.guestsCardCount", { count: guestCount }) : t("portal.home.guestsCardEmpty"),
      attention: false,
      done: guestCount > 0,
    },
    {
      href: "/portal/wishlist",
      icon: ListChecks,
      title:
        wishes.quoted > 0
          ? t("portal.home.wishQuotedTitle", { count: wishes.quoted })
          : wishes.unavailable > 0
            ? t("portal.home.wishUnavailableTitle", { count: wishes.unavailable })
            : t("portal.home.wishCardTitle"),
      body:
        wishes.quoted > 0
          ? wishes.unavailable > 0
            ? `${t("portal.home.wishQuotedBody")} ${t("portal.home.wishUnavailableTitle", { count: wishes.unavailable })}.`
            : t("portal.home.wishQuotedBody")
          : wishes.unavailable > 0 ? t("portal.home.wishUnavailableBody") : t("portal.home.wishCardBody"),
      attention: wishes.quoted + wishes.unavailable > 0,
      done: false,
    },
    {
      href: "/portal/schedule",
      icon: CalendarClock,
      title: plan.kind === "changed" ? t("portal.home.scheduleChangedTitle") : t("portal.home.scheduleCardTitle"),
      body: plan.kind === "changed" ? t("portal.home.scheduleChangedBody") : t("portal.home.scheduleCardBody"),
      attention: plan.kind === "changed",
      done: plan.kind === "shared",
    },
    {
      href: "/portal/messages",
      icon: MessageCircle,
      title: unread > 0 ? t("portal.home.messageUnreadTitle") : t("portal.home.messageCardTitle"),
      body: unread > 0 ? t("portal.home.messageUnreadBody", { count: unread }) : t("portal.home.messageCardBody"),
      attention: unread > 0,
      done: false,
    },
  ];

  // Progress counts only the tasks that have a measurable done state (guest list, day plan).
  const trackable = [steps[0], steps[2]];
  const doneCount = trackable.filter((x) => x.done).length;
  const percent = Math.round((doneCount / trackable.length) * 100);
  // Open tasks first (needs-attention before the rest), finished ones last.
  const ordered = [...steps].sort(
    (x, y) => Number(x.done && !x.attention) - Number(y.done && !y.attention) || Number(y.attention) - Number(x.attention),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#5e1f3d] p-5 text-primary-foreground shadow-rn-hero-success ring-1 ring-gold/50 sm:p-7">
        <BotanicalSprig className="absolute -right-3 -top-2 h-40 w-32 text-primary-foreground/25 sm:h-52 sm:w-40" />
        <BotanicalSprig className="absolute -bottom-6 right-16 h-28 w-20 -rotate-12 text-gold/50" />
        <p className="relative text-app-sm font-semibold text-primary-foreground/85">
          {t("portal.home.greeting", { name: ctx.fullName.split(" ")[0] ?? ctx.fullName })}
        </p>
        {days != null && days > 1 ? (
          <h1 className="relative flex items-baseline gap-3 !text-primary-foreground">
            <span className="font-serif text-6xl font-semibold leading-none tracking-tight tabular-nums sm:text-7xl">{days}</span>
            <span className="text-app-base font-semibold text-primary-foreground/85">{t("portal.home.countdownLabel")}</span>
          </h1>
        ) : countdown ? (
          <h1 className="relative font-serif text-3xl font-semibold leading-tight tracking-tight !text-primary-foreground sm:text-4xl">{countdown}</h1>
        ) : null}
        <ul className="relative flex flex-wrap gap-2 text-app-sm font-medium">
          {ctx.booking.eventDate ? (
            <li className="flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {t("portal.home.eventOn", {
                type: ctx.booking.eventType ?? "",
                date: formatDate(ctx.booking.eventDate),
              }).trim()}
            </li>
          ) : null}
          {ctx.booking.guestCount ? (
            <li className="flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1.5">
              <Users className="size-4" aria-hidden />
              {t("portal.home.guests", { count: ctx.booking.guestCount })}
            </li>
          ) : null}
        </ul>
      </header>

      <section className="flex flex-col gap-4">
        <div className="relative flex items-center gap-5 overflow-hidden rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
          <BotanicalSprig className="absolute -right-4 -top-3 h-32 w-24 text-primary/15" />
          <div className="relative size-24 shrink-0" role="img" aria-label={`${percent} %`}>
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" className="stroke-primary/12" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="7"
                strokeLinecap="round"
                className="stroke-primary"
                strokeDasharray={`${(percent / 100) * 263.9} 263.9`}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <Blossom className="size-5 text-gold" filled />
              <span className="font-serif text-2xl font-semibold leading-none tabular-nums text-foreground">{percent}%</span>
            </span>
          </div>
          <div className="relative flex min-w-0 flex-col gap-1">
            <h2 className="font-serif text-xl font-semibold leading-tight">{t("portal.home.nextTitle")}</h2>
            <p className="text-app-sm text-muted-foreground tabular-nums">
              {doneCount} / {trackable.length}
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-3">
          {ordered.map(({ href, icon: Icon, title, body, attention, done }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex min-h-[4.5rem] items-center gap-4 rounded-2xl px-4 py-3 shadow-rn-card ring-1 transition-colors active:bg-muted ${
                  done && !attention ? "bg-card/70 ring-gold/25" : "bg-card ring-gold/50 hover:bg-primary-soft/60"
                }`}
              >
                <span
                  className={`relative flex size-12 shrink-0 items-center justify-center rounded-full ${attention ? "bg-success text-white" : "bg-primary-soft text-success"}`}
                >
                  <Icon className="size-5" aria-hidden />
                  {done && !attention ? (
                    <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-card text-gold ring-1 ring-gold/60">
                      <Blossom className="size-5" filled />
                    </span>
                  ) : (
                    <span
                      className="absolute -bottom-1 -right-1 size-6 rounded-full border-2 border-dashed border-gold bg-card"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-serif text-base font-semibold">{title}</span>
                  <span className="text-app-sm text-muted-foreground">{body}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-gold" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
