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
        <h1 className="font-heading text-3xl font-bold tracking-tight">{t("portal.wishlist.title")}</h1>
        <p className="text-muted-foreground">{t("portal.wishlist.lead", { org: ctx.organization.name })}</p>
      </header>
      <WishlistView items={items} />
    </div>
  );
}
