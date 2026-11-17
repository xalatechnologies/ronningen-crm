import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_REVEAL_MODE,
  giversVisible,
  toCoupleView,
  toGuestView,
  type CoupleGiftWish,
  type GiftKind,
  type GiftSettings,
  type GiftWish,
  type GuestGiftWish,
  type RevealMode,
} from "./gift-rules";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type Admin = ReturnType<typeof createSupabaseAdminClient>;

type WishRow = { id: string; kind: GiftKind; title: string; url: string | null; image_url: string | null; price_nok: number | null; note: string; quantity?: number | null };
const WISH_COLUMNS = "id, kind, title, url, image_url, price_nok, note";
const toWish = (r: WishRow): GiftWish => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  url: r.url,
  imageUrl: r.image_url,
  priceNok: r.price_nok,
  note: r.note ?? "",
  quantity: r.quantity ?? 1,
});

/** The booking's wishes in the order they were made. Without the quantity column (migration pending) every wish counts as one. */
async function selectWishes(client: Client | Admin, bookingId: string): Promise<GiftWish[]> {
  const q = (cols: string) => client.from("gift_wishes" as never).select(cols).eq("booking_id", bookingId).order("created_at", { ascending: true });
  const withQuantity = await q(`${WISH_COLUMNS}, quantity`);
  const { data } = withQuantity.error ? await q(WISH_COLUMNS) : withQuantity;
  return ((data as unknown as WishRow[] | null) ?? []).map(toWish);
}

export async function getGiftSettings(client: Client | Admin, bookingId: string): Promise<GiftSettings> {
  const { data } = await client.from("gift_wish_settings" as never).select("shared, reveal_mode").eq("booking_id", bookingId).maybeSingle();
  const row = data as unknown as { shared: boolean; reveal_mode: RevealMode } | null;
  return { shared: row?.shared ?? false, revealMode: row?.reveal_mode ?? DEFAULT_REVEAL_MODE };
}

/** wish -> the guests who took it, read with the service role (the claims table has no client access at all). */
async function claimMap(admin: Admin, bookingId: string): Promise<Map<string, string[]>> {
  const { data } = await admin.from("gift_wish_claims" as never).select("wish_id, guest_id").eq("booking_id", bookingId);
  const map = new Map<string, string[]>();
  for (const r of (data as unknown as { wish_id: string; guest_id: string }[] | null) ?? []) map.set(r.wish_id, [...(map.get(r.wish_id) ?? []), r.guest_id]);
  return map;
}

/**
 * The couple's list. Whether a gift is taken is always shown; the giver's NAME only when their own setting
 * allows it (default: after the event date). The names are never read from the database otherwise.
 */
export async function loadCoupleGifts(
  client: Client,
  bookingId: string,
  eventDate: string | null,
): Promise<{ wishes: CoupleGiftWish[]; settings: GiftSettings; giversShown: boolean }> {
  const [wishes, settings] = await Promise.all([selectWishes(client, bookingId), getGiftSettings(client, bookingId)]);
  const admin = createSupabaseAdminClient();
  const claims = await claimMap(admin, bookingId);
  const giversShown = giversVisible(settings.revealMode, eventDate);
  const names = new Map<string, string>();
  if (giversShown && claims.size > 0) {
    const { data: guests } = await admin.from("portal_guests" as never).select("id, name").in("id", [...new Set([...claims.values()].flat())]);
    for (const g of (guests as unknown as { id: string; name: string }[] | null) ?? []) names.set(g.id, g.name);
  }
  return { wishes: toCoupleView(wishes, claims, names, giversShown), settings, giversShown };
}

/** The guest's view: empty unless the couple switched sharing on. Other givers are never named. */
export async function loadGuestGifts(guestId: string, bookingId: string): Promise<GuestGiftWish[]> {
  const admin = createSupabaseAdminClient();
  const settings = await getGiftSettings(admin, bookingId);
  if (!settings.shared) return [];
  const [wishes, claims] = await Promise.all([selectWishes(admin, bookingId), claimMap(admin, bookingId)]);
  return toGuestView(wishes, claims, guestId);
}

export async function countGiftWishes(client: Client, bookingId: string): Promise<number> {
  const { count } = await client.from("gift_wishes" as never).select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  return count ?? 0;
}
