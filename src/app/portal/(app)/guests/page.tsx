import { GuestsView } from "@/components/portal/guests-view";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { listGuests } from "@/lib/portal/guests";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalGuestsPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const guests = await listGuests(await createServerSupabaseClient(), ctx.booking.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("portal.guests.title")}</h1>
        <p className="text-muted-foreground">{t("portal.guests.lead")}</p>
      </header>
      <GuestsView guests={guests} />
    </div>
  );
}
