import { CalendarClock, CalendarDays, Check, ChevronRight, ListChecks, MessageCircle, Users } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl bg-primary p-5 text-primary-foreground sm:p-7">
        <p className="text-app-sm font-semibold text-primary-foreground/75">
          {t("portal.home.greeting", { name: ctx.fullName.split(" ")[0] ?? ctx.fullName })}
        </p>
        {days != null && days > 1 ? (
          <h1 className="flex items-baseline gap-3 !text-primary-foreground">
            <span className="font-heading text-6xl font-bold leading-none tracking-tight tabular-nums sm:text-7xl">{days}</span>
            <span className="text-app-base font-semibold text-primary-foreground/85">{t("portal.home.countdownLabel")}</span>
          </h1>
        ) : countdown ? (
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight !text-primary-foreground sm:text-4xl">{countdown}</h1>
        ) : null}
        <ul className="flex flex-wrap gap-2 text-app-sm font-medium">
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

      <section className="flex flex-col gap-3">
        <h2 className="px-1 font-heading text-lg font-semibold">{t("portal.home.nextTitle")}</h2>
        <ul className="divide-y divide-foreground/8 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
          {steps.map(({ href, icon: Icon, title, body, attention, done }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-[4.5rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <span
                  className={`relative flex size-11 shrink-0 items-center justify-center rounded-full ${attention ? "bg-success text-white" : "bg-success/12 text-success"}`}
                >
                  <Icon className="size-5" aria-hidden />
                  {done && !attention ? (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-success text-white ring-2 ring-card">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{title}</span>
                  <span className="text-app-sm text-muted-foreground">{body}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
