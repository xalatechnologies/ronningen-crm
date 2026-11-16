import { InviteDesigner } from "@/components/portal/invite-designer";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { getInviteDesign } from "@/lib/portal/invite-design";
import { defaultDesign } from "@/lib/portal/invite-rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalInvitationPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { locale } = await getServerTranslation();
  const saved = await getInviteDesign(await createServerSupabaseClient(), ctx.booking.id);
  const initial = saved ?? defaultDesign({ eventDate: ctx.booking.eventDate, venueName: ctx.organization.name, locale });

  return (
    <div className="flex flex-col gap-6">
      <InviteDesigner initial={initial} venueName={ctx.organization.name} />
    </div>
  );
}
