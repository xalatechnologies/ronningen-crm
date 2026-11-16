import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { GoldDivider } from "@/components/brand/botanical";
import { GiftWishesView } from "@/components/portal/gift-wishes-view";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { loadCoupleGifts } from "@/lib/portal/gifts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalGiftsPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const { wishes, settings, giversShown } = await loadCoupleGifts(await createServerSupabaseClient(), ctx.booking.id, ctx.booking.eventDate);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/portal/guests" className="inline-flex min-h-11 w-fit items-center gap-1 text-app-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden />
          {t("portal.gifts.back")}
        </Link>
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{t("portal.gifts.title")}</h1>
        <p className="text-muted-foreground">{t("portal.gifts.lead")}</p>
        <GoldDivider className="mt-2" />
      </header>
      <GiftWishesView wishes={wishes} settings={settings} giversShown={giversShown} />
    </div>
  );
}
