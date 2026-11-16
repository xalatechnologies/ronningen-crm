import { GiftWishesView } from "@/components/portal/gift-wishes-view";
import { getPortalContext } from "@/lib/portal/context";
import { loadCoupleGifts } from "@/lib/portal/gifts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalGiftsPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { wishes, settings, giversShown } = await loadCoupleGifts(await createServerSupabaseClient(), ctx.booking.id, ctx.booking.eventDate);

  return (
    <div className="flex flex-col gap-6">
      <GiftWishesView wishes={wishes} settings={settings} giversShown={giversShown} />
    </div>
  );
}
