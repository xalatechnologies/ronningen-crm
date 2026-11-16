"use server";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { giftRateLimited } from "./gift-rules";
import { portalEnabledForBooking } from "./guest-public";
import { guestIdForToken } from "./guest-tokens";

export type GiftClaimResult = { ok: true } | { ok: false; error: "not_found" | "taken" | "limit" | "rate_limited" | "failed" };

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Resolves the link to a guest and applies the per-guest rate limit. Everything else is decided here, never in the browser. */
async function authorise(admin: Admin, token: string, wishId: string): Promise<{ guestId: string } | { error: "not_found" | "rate_limited" | "failed" }> {
  const guestId = await guestIdForToken(admin, typeof token === "string" ? token : "");
  if (!guestId || !z.string().uuid().safeParse(wishId).success) return { error: "not_found" };

  const { data: g } = await admin.from("portal_guests" as never).select("booking_id").eq("id", guestId).maybeSingle();
  const bookingId = (g as unknown as { booking_id: string } | null)?.booking_id;
  if (!bookingId || !(await portalEnabledForBooking(admin, bookingId))) return { error: "not_found" };

  const { data: l } = await admin.from("gift_wish_guest_limits" as never).select("last_action_at, action_count").eq("guest_id", guestId).maybeSingle();
  const limit = l as unknown as { last_action_at: string; action_count: number } | null;
  if (giftRateLimited(limit?.last_action_at ?? null, limit?.action_count ?? 0)) return { error: "rate_limited" };
  const { error } = await admin
    .from("gift_wish_guest_limits" as never)
    .upsert({ guest_id: guestId, last_action_at: new Date().toISOString(), action_count: (limit?.action_count ?? 0) + 1 } as never, { onConflict: "guest_id" });
  return error ? { error: "failed" } : { guestId };
}

/** Public: "I'll give this". Atomic in the database (one giver per wish; sharing must be on; 10 per guest). */
export async function claimGift(token: string, wishId: string): Promise<GiftClaimResult> {
  const admin = createSupabaseAdminClient();
  const auth = await authorise(admin, token, wishId);
  if ("error" in auth) return { ok: false, error: auth.error };
  const { data, error } = await admin.rpc("gift_wish_claim" as never, { p_guest_id: auth.guestId, p_wish_id: wishId } as never);
  if (error) return { ok: false, error: "failed" };
  const status = data as unknown as string;
  return status === "ok" ? { ok: true } : { ok: false, error: status === "taken" || status === "limit" ? status : "not_found" };
}

/** Public: a guest frees a gift they had taken. Only their own claim can be removed. */
export async function releaseGift(token: string, wishId: string): Promise<GiftClaimResult> {
  const admin = createSupabaseAdminClient();
  const auth = await authorise(admin, token, wishId);
  if ("error" in auth) return { ok: false, error: auth.error };
  const { error } = await admin.from("gift_wish_claims" as never).delete().eq("wish_id", wishId).eq("guest_id", auth.guestId);
  return error ? { ok: false, error: "failed" } : { ok: true };
}
