import { CalendarClock, CalendarDays, ChevronRight, ListChecks, MessageCircle, Users } from "lucide-react";
import Link from "next/link";

import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { countUnread } from "@/lib/portal/messages";
import { countQuoted } from "@/lib/portal/wishlist";
import { countGuests } from "@/lib/portal/guests";
import { listScheduleItems, listScheduleVersions, scheduleContentHash } from "@/lib/portal/schedule";
import { shareState } from "@/lib/portal/schedule-rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function daysUntil(isoDate: string): number {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000);
}

export default async function PortalHomePage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t, formatDate } = await getServerTranslation();

  const supabase = await createServerSupabaseClient();
  const [unread, quoted, entries, versions, guestCount] = await Promise.all([
    countUnread(supabase, ctx.booking.id, "customer"),
    countQuoted(supabase, ctx.booking.id),
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
    days == null
      ? null
      : days > 0
        ? t("portal.home.countdownDays", { count: days })
        : days === 0
          ? t("portal.home.countdownToday")
          : t("portal.home.countdownPast");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-app-sm font-semibold text-muted-foreground">
          {t("portal.home.greeting", { name: ctx.fullName.split(" ")[0] ?? ctx.fullName })}
        </p>
        {countdown ? (
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{countdown}</h1>
        ) : null}
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-app-base text-muted-foreground">
          {ctx.booking.eventDate ? (
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden />
              {t("portal.home.eventOn", {
                type: ctx.booking.eventType ?? "",
                date: formatDate(ctx.booking.eventDate),
              }).trim()}
            </li>
          ) : null}
          {ctx.booking.guestCount ? (
            <li className="flex items-center gap-2">
              <Users className="size-4" aria-hidden />
              {t("portal.home.guests", { count: ctx.booking.guestCount })}
            </li>
          ) : null}
        </ul>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">{t("portal.home.nextTitle")}</h2>
        <Link
          href="/portal/guests"
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <Users className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{t("portal.home.guestsCardTitle")}</span>
            <span className="text-app-sm text-muted-foreground">
              {guestCount > 0 ? t("portal.home.guestsCardCount", { count: guestCount }) : t("portal.home.guestsCardEmpty")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <Link
          href="/portal/wishlist"
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <ListChecks className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">
              {quoted > 0 ? t("portal.home.wishQuotedTitle", { count: quoted }) : t("portal.home.wishCardTitle")}
            </span>
            <span className="text-app-sm text-muted-foreground">
              {quoted > 0 ? t("portal.home.wishQuotedBody") : t("portal.home.wishCardBody")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <Link
          href="/portal/schedule"
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <CalendarClock className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">
              {plan.kind === "changed" ? t("portal.home.scheduleChangedTitle") : t("portal.home.scheduleCardTitle")}
            </span>
            <span className="text-app-sm text-muted-foreground">
              {plan.kind === "changed" ? t("portal.home.scheduleChangedBody") : t("portal.home.scheduleCardBody")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <Link
          href="/portal/messages"
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/8 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">
              {unread > 0 ? t("portal.home.messageUnreadTitle") : t("portal.home.messageCardTitle")}
            </span>
            <span className="text-app-sm text-muted-foreground">
              {unread > 0
                ? t("portal.home.messageUnreadBody", { count: unread })
                : t("portal.home.messageCardBody")}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
