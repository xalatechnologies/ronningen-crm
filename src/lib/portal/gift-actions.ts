"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { giftSettingsSchema, giftWishInputSchema, type GiftSettings, type GiftWishInput } from "./gift-rules";

export type GiftResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "not_found" | "limit" | "failed" };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
const wishes = (c: Client) => c.from("gift_wishes" as never);
const refresh = () => revalidatePath("/portal", "layout");

/** Creates or edits one gift wish. The booking comes from the session; RLS, column grants and checks enforce it again. */
export async function saveGiftWish(input: GiftWishInput): Promise<GiftResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = giftWishInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, kind, title, url, imageUrl, priceNok, note } = parsed.data;
  const fields = { kind, title, url, image_url: imageUrl, price_nok: priceNok, note };

  const supabase = await createServerSupabaseClient();
  if (id) {
    const { data, error } = await wishes(supabase)
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("booking_id", ctx.booking.id)
      .select("id");
    if (error) return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  } else {
    const { error } = await wishes(supabase).insert({
      ...fields,
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      created_by: ctx.userId,
    } as never);
    if (error) {
      if (error.code === "23514" && error.message?.includes("100")) return { ok: false, error: "limit" };
      return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    }
  }
  refresh();
  return { ok: true };
}

export async function deleteGiftWish(wishId: string): Promise<GiftResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!z.string().uuid().safeParse(wishId).success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await wishes(supabase).delete().eq("id", wishId).eq("booking_id", ctx.booking.id).select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}

/** Sharing on/off and who-gave-what visibility. Only the booking's own customer can change it. */
export async function saveGiftSettings(input: GiftSettings): Promise<GiftResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = giftSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const settings = () => supabase.from("gift_wish_settings" as never);
  const values = { shared: parsed.data.shared, reveal_mode: parsed.data.revealMode, updated_at: new Date().toISOString() };
  // Not an upsert: ON CONFLICT DO UPDATE would also write booking_id/organization_id, which the column grants forbid.
  const update = () => settings().update(values as never).eq("booking_id", ctx.booking.id).select("booking_id");

  const first = await update();
  let error = first.error;
  if (!error && ((first.data as unknown[] | null)?.length ?? 0) === 0) {
    ({ error } = await settings().insert({ booking_id: ctx.booking.id, organization_id: ctx.organization.id, shared: values.shared, reveal_mode: values.reveal_mode } as never));
    // A parallel first save created the row meanwhile: update it instead.
    if (error?.code === "23505") ({ error } = await update());
  }
  if (error) return { ok: false, error: "failed" };
  refresh();
  return { ok: true };
}
