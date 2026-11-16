import Link from "next/link";

import { WishlistView } from "@/components/portal/wishlist-view";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { listWishItems } from "@/lib/portal/wishlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalWishlistPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const items = await listWishItems(await createServerSupabaseClient(), ctx.booking.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{t("portal.wishlist.title")}</h1>
        <p className="text-muted-foreground">{t("portal.wishlist.lead", { org: ctx.organization.name })}</p>
      </header>
      <WishlistView items={items} />
      <p className="px-1 text-center text-app-sm text-muted-foreground">
        {t("portal.wishlist.giftsHint")}{" "}
        <Link href="/portal/guests/gifts" className="font-semibold text-primary underline">
          {t("portal.wishlist.giftsLink")}
        </Link>
      </p>
    </div>
  );
}
