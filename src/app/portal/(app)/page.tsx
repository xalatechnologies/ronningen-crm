import { CalendarDays, Users } from "lucide-react";

import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";

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

      <section className="flex flex-col gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
        <h2 className="font-heading text-xl font-semibold">{t("portal.home.nextTitle")}</h2>
        <p className="text-muted-foreground">{t("portal.home.nextBody")}</p>
      </section>
    </div>
  );
}
