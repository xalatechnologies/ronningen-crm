import { InviteCard } from "@/components/portal/invite-card";
import { GuestRsvpForm } from "@/components/portal/guest-rsvp-form";
import { getServerTranslation } from "@/i18n/server";
import { GuestActivities } from "@/components/portal/guest-activities";
import { listGuestActivities } from "@/lib/portal/activities";
import { loadPublicInvite } from "@/lib/portal/guest-public";

export const dynamic = "force-dynamic";

export default async function GuestInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, locale } = await getServerTranslation();
  const invite = await loadPublicInvite(token);

  if (!invite) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-12 text-center text-foreground">
        <div className="flex max-w-sm flex-col gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
          <h1 className="font-heading text-xl font-bold">{t("portal.guestPage.invalid")}</h1>
          <p className="text-muted-foreground">{t("portal.guestPage.invalidHint")}</p>
        </div>
      </main>
    );
  }

  const { design, guest } = invite;
  const activities = guest.status === "declined" ? [] : await listGuestActivities(guest.id, invite.bookingId);
  const deadline = design.rsvpDeadline
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${design.rsvpDeadline}T00:00:00Z`))
    : "";

  return (
    <main className="min-h-svh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <p className="px-1 font-heading text-lg font-semibold">{t("portal.guestPage.hello", { name: guest.name })}</p>
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
        <GuestRsvpForm token={token} guest={guest} closed={invite.closed} hostName={invite.hostName || invite.venueName} />
        {invite.schedule.length > 0 && guest.status !== "declined" ? (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
            <h2 className="font-heading text-lg font-semibold">{t("portal.guestPage.scheduleTitle")}</h2>
            <ol className="flex flex-col gap-3">
              {invite.schedule.map((e, i) => (
                <li key={`${e.startTime}-${i}`} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3">
                  <span className="font-heading text-lg font-bold tabular-nums">{e.startTime}</span>
                  <span className="break-words font-medium">{e.title}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <GuestActivities token={token} activities={activities} />
      </div>
    </main>
  );
}
