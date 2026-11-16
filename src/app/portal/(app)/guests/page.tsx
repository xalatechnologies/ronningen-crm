import { GuestsView } from "@/components/portal/guests-view";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { guestInvitesEnabled, listGuests } from "@/lib/portal/guests";
import { selectRecipients } from "@/lib/portal/rsvp-rules";
import { getInviteDesign } from "@/lib/portal/invite-design";
import { GoldDivider } from "@/components/brand/botanical";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalGuestsPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const [guests, design, invitesEnabled] = await Promise.all([
    listGuests(supabase, ctx.booking.id),
    getInviteDesign(supabase, ctx.booking.id),
    guestInvitesEnabled(ctx.organization.id),
  ]);
  const candidates = guests.map((g) => ({ id: g.id, email: g.email, status: g.status, optedOut: g.optedOut, lastSentAt: g.lastSentAt }));
  const sendState = {
    enabled: invitesEnabled,
    published: design?.status === "published",
    inviteCount: selectRecipients(candidates, "invite", 0).send.length,
    reminderCount: selectRecipients(candidates, "reminder", 0).send.length,
    missingEmail: guests.filter((g) => !g.email && g.status === "not_sent").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{t("portal.guests.title")}</h1>
        <p className="text-muted-foreground">{t("portal.guests.lead")}</p>
        <GoldDivider className="mt-2" />
      </header>
      <GuestsView guests={guests} sendState={sendState} />
    </div>
  );
}
