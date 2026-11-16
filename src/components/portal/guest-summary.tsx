import { CalendarHeart, CircleCheck, Gift } from "lucide-react";

import { getServerTranslation } from "@/i18n/server";
import type { GuestActivity } from "@/lib/portal/activities";
import type { GuestGiftWish } from "@/lib/portal/gift-rules";
import type { GuestStatus } from "@/lib/portal/guest-rules";

/** "Din side": what this guest has answered and chosen so far, with a shortcut to change each part. */
export async function GuestSummary({
  status,
  partySize,
  activities,
  gifts,
}: {
  status: GuestStatus;
  partySize: number;
  activities: GuestActivity[];
  gifts: GuestGiftWish[];
}) {
  const { t } = await getServerTranslation();
  const rsvp =
    status === "accepted"
      ? t("portal.guestPage.sumAccepted", { count: partySize })
      : status === "declined"
        ? t("portal.guestPage.sumDeclined")
        : status === "maybe"
          ? t("portal.guestPage.sumMaybe")
          : t("portal.guestPage.sumNoAnswer");
  const going = activities.filter((a) => a.myResponse === "yes").length;
  const mine = gifts.filter((g) => g.state === "mine");

  const rows = [
    { href: "#rsvp", icon: CircleCheck, label: t("portal.guestPage.sumRsvp"), value: rsvp, show: true },
    {
      href: "#activities",
      icon: CalendarHeart,
      label: t("portal.guestPage.activitiesTitle"),
      value: t("portal.guestPage.sumActivities", { yes: going, total: activities.length }),
      show: activities.length > 0,
    },
    {
      href: "#gifts",
      icon: Gift,
      label: t("portal.guestPage.sumGifts"),
      value: mine.length > 0 ? mine.map((g) => g.title).join(", ") : t("portal.guestPage.sumNoGifts"),
      show: gifts.length > 0,
    },
  ].filter((r) => r.show);

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-rn-card ring-1 ring-gold/40">
      <div>
        <h2 className="font-serif text-xl font-semibold">{t("portal.guestPage.sumTitle")}</h2>
        <p className="text-app-sm text-muted-foreground">{t("portal.guestPage.sumHelp")}</p>
      </div>
      <ul className="flex flex-col divide-y divide-gold/30">
        {rows.map((r) => (
          <li key={r.href}>
            <a href={r.href} className="flex min-h-14 items-center gap-3 py-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-primary">
                <r.icon className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</span>
                <span className="break-words font-semibold">{r.value}</span>
              </span>
              <span className="shrink-0 text-app-sm font-semibold text-primary underline">{t("portal.guestPage.sumChange")}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
