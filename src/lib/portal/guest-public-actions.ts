"use server";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { guestIdForToken } from "./guest-tokens";
import { deadlinePassed, normalizeRsvp, rateLimited, type RsvpFailure, type RsvpInput } from "./rsvp-rules";

export type RsvpResult = { ok: true } | { ok: false; error: RsvpFailure | "failed" };

/**
 * Public: a guest answers through their secret link. Everything that matters is decided here, never in the
 * browser: which guest (the link), the party limit, consent, the deadline, and a per-guest rate limit.
 */
export async function submitRsvp(token: string, input: RsvpInput): Promise<RsvpResult> {
  const admin = createSupabaseAdminClient();
  const guestId = await guestIdForToken(admin, typeof token === "string" ? token : "");
  if (!guestId) return { ok: false, error: "not_found" };

  const { data: g } = await admin
    .from("portal_guests" as never)
    .select("id, booking_id, max_party, rsvp_count, last_rsvp_at")
    .eq("id", guestId)
    .maybeSingle();
  const guest = g as unknown as { id: string; booking_id: string; max_party: number; rsvp_count: number; last_rsvp_at: string | null } | null;
  if (!guest) return { ok: false, error: "not_found" };

  const { data: d } = await admin
    .from("portal_invite_designs" as never)
    .select("status, rsvp_deadline")
    .eq("booking_id", guest.booking_id)
    .maybeSingle();
  const design = d as unknown as { status: string; rsvp_deadline: string | null } | null;
  if (!design || design.status !== "published") return { ok: false, error: "not_found" };
  if (deadlinePassed(design.rsvp_deadline)) return { ok: false, error: "deadline_passed" };
  if (rateLimited(guest.last_rsvp_at, guest.rsvp_count)) return { ok: false, error: "rate_limited" };

  const normalized = normalizeRsvp(input, guest.max_party);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const now = new Date().toISOString();
  const { error } = await admin
    .from("portal_guests" as never)
    .update({
      status: normalized.status,
      party_size: normalized.partySize,
      diet: normalized.diet,
      diet_consent_at: normalized.hasDiet ? now : null,
      responded_at: now,
      rsvp_count: guest.rsvp_count + 1,
      last_rsvp_at: now,
      updated_at: now,
    } as never)
    .eq("id", guest.id);
  return error ? { ok: false, error: "failed" } : { ok: true };
}

/** Public: the guest stops reminders (they can still answer and the host still sees their status). */
export async function setReminders(token: string, stop: boolean): Promise<{ ok: boolean }> {
  const admin = createSupabaseAdminClient();
  const guestId = await guestIdForToken(admin, typeof token === "string" ? token : "");
  if (!guestId) return { ok: false };
  const { error } = await admin
    .from("portal_guests" as never)
    .update({ opted_out: stop } as never)
    .eq("id", guestId);
  return { ok: !error };
}
