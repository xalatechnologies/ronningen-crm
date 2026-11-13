import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ActivitiesView } from "@/components/portal/activities-view";
import { getServerTranslation } from "@/i18n/server";
import { listActivities } from "@/lib/portal/activities";
import { getPortalContext } from "@/lib/portal/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalActivitiesPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const { items, guests } = await listActivities(await createServerSupabaseClient(), ctx.booking.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/portal/guests" className="inline-flex min-h-11 w-fit items-center gap-1 text-app-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          {t("portal.activities.back")}
        </Link>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("portal.activities.title")}</h1>
        <p className="text-muted-foreground">{t("portal.activities.lead")}</p>
      </header>
      <ActivitiesView items={items} guests={guests} />
    </div>
  );
}
