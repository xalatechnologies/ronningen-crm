import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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
  const { t, locale } = await getServerTranslation();
  const saved = await getInviteDesign(await createServerSupabaseClient(), ctx.booking.id);
  const initial = saved ?? defaultDesign({ eventDate: ctx.booking.eventDate, venueName: ctx.organization.name, locale });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/portal/guests" className="inline-flex min-h-11 w-fit items-center gap-1 text-app-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          {t("portal.invitation.back")}
        </Link>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("portal.invitation.title")}</h1>
        <p className="text-muted-foreground">{t("portal.invitation.lead")}</p>
      </header>
      <InviteDesigner initial={initial} venueName={ctx.organization.name} />
    </div>
  );
}
