import { getServerTranslation } from "@/i18n/server";
import { CustomerMessageThread } from "@/components/portal/customer-message-thread";
import { MessageTargets } from "@/components/portal/message-targets";
import { getPortalContext } from "@/lib/portal/context";
import { listGuestMessages, listMessageActivities } from "@/lib/portal/guest-messages";
import { guestInvitesEnabled, listGuests } from "@/lib/portal/guests";
import { getInviteDesign } from "@/lib/portal/invite-design";
import { listThread } from "@/lib/portal/messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalMessagesPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const [messages, guests, design, invitesEnabled, history, activities] = await Promise.all([
    listThread(supabase, ctx.booking.id, { customerName: ctx.fullName, venueName: ctx.organization.name }),
    listGuests(supabase, ctx.booking.id),
    getInviteDesign(supabase, ctx.booking.id),
    guestInvitesEnabled(ctx.organization.id),
    listGuestMessages(supabase, ctx.booking.id),
    listMessageActivities(supabase, ctx.booking.id),
  ]);
  const canMessageGuests = invitesEnabled && design?.status === "published" && guests.some((g) => g.email);

  return (
    <div className="flex flex-col gap-6 lg:mx-auto lg:w-full lg:max-w-4xl">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{t("portal.messages.title")}</h1>
        <p className="text-muted-foreground">{t("portal.messages.lead", { org: ctx.organization.name })}</p>
      </header>
      <MessageTargets guests={guests} messaging={{ history, activities }} canMessageGuests={Boolean(canMessageGuests)} />
      <CustomerMessageThread messages={messages} />
    </div>
  );
}
