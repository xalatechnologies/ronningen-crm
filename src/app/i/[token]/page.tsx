import { BigBloom } from "@/components/brand/botanical";
import { InviteCard } from "@/components/portal/invite-card";
import { GuestRsvpForm } from "@/components/portal/guest-rsvp-form";
import { getServerTranslation } from "@/i18n/server";
import { GuestActivities } from "@/components/portal/guest-activities";
import { listGuestActivities } from "@/lib/portal/activities";
import { loadPublicInvite } from "@/lib/portal/guest-public";
import { GuestGifts } from "@/components/portal/guest-gifts";
import { CollapsibleCard } from "@/components/portal/collapsible-card";
import { GuestSummary } from "@/components/portal/guest-summary";
import { loadGuestGifts } from "@/lib/portal/gifts";
import { loadGuestTable } from "@/lib/portal/seating";

export const dynamic = "force-dynamic";

export default async function GuestInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, locale } = await getServerTranslation();
  const invite = await loadPublicInvite(token);

  if (!invite) {
    return (
      <main className="wedding-portal flex min-h-svh flex-col items-center justify-center bg-background px-5 py-12 text-center text-foreground">
        <div className="flex max-w-sm flex-col gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
          <h1 className="font-heading text-xl font-bold">{t("portal.guestPage.invalid")}</h1>
          <p className="text-muted-foreground">{t("portal.guestPage.invalidHint")}</p>
        </div>
      </main>
    );
  }

  const { design, guest } = invite;
  const activities = guest.status === "declined" ? [] : await listGuestActivities(guest.id, invite.bookingId);
  const [gifts, table] = await Promise.all([loadGuestGifts(guest.id, invite.bookingId), loadGuestTable(guest.id, invite.bookingId)]);
  const deadline = design.rsvpDeadline
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${design.rsvpDeadline}T00:00:00Z`))
    : "";

  return (
    <main className="wedding-portal relative min-h-svh overflow-hidden bg-background px-4 py-6 text-foreground">
      <BigBloom className="absolute -right-24 top-40 size-80 text-primary/10" />
      <BigBloom className="absolute -left-28 bottom-24 size-72 rotate-12 text-gold/20" />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6">
        <p className="px-1 font-serif text-xl font-semibold">{t("portal.guestPage.hello", { name: guest.name })}</p>
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <InviteCard
            design={design}
            labels={{
              invited: t("portal.invitation.cardInvited"),
              when: t("portal.invitation.cardWhen"),
              where: t("portal.invitation.cardWhere"),
              dress: t("portal.invitation.cardDress"),
              rsvpBy: deadline ? t("portal.invitation.cardRsvpBy", { date: deadline }) : "",
              hostedAt: invite.venueName ? t("portal.invitation.cardHostedAt", { venue: invite.venueName }) : "",
            }}
          />
        </div>
        <GuestSummary status={guest.status} partySize={guest.partySize} activities={activities} gifts={gifts} table={table} />
        <div id="rsvp" className="scroll-mt-4">
          <GuestRsvpForm token={token} guest={guest} closed={invite.closed} hostName={invite.hostName || invite.venueName} />
        </div>
        {invite.schedule.length > 0 && guest.status !== "declined" ? (
          <CollapsibleCard title={t("portal.guestPage.scheduleTitle")} summary={`${invite.schedule[0].startTime} ${invite.schedule[0].title}`}>
            <ol className="flex flex-col gap-3">
              {invite.schedule.map((e, i) => (
                <li key={`${e.startTime}-${i}`} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3">
                  <span className="font-serif text-lg font-semibold tabular-nums">{e.startTime}</span>
                  <span className="break-words font-medium">{e.title}</span>
                </li>
              ))}
            </ol>
          </CollapsibleCard>
        ) : null}
        <div id="activities" className="scroll-mt-4 empty:hidden">
          <GuestActivities token={token} activities={activities} />
        </div>
        <div id="gifts" className="scroll-mt-4 empty:hidden">
          <GuestGifts token={token} wishes={gifts} />
        </div>
      </div>
    </main>
  );
}
