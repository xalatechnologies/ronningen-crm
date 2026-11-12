"use server";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { clampActivityPeople, clearActivityAnswers, guestIdForToken } from "./guest-tokens";
import { portalEnabledForBooking } from "./guest-public";
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

  const [{ data: d }, portalOn] = await Promise.all([
    admin.from("portal_invite_designs" as never).select("status, rsvp_deadline").eq("booking_id", guest.booking_id).maybeSingle(),
    portalEnabledForBooking(admin, guest.booking_id),
  ]);
  const design = d as unknown as { status: string; rsvp_deadline: string | null } | null;
  if (!design || design.status !== "published" || !portalOn) return { ok: false, error: "not_found" };
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
  if (error) return { ok: false, error: "failed" };

  // Activity answers follow the reply: declining removes them, a smaller party frees places.
  if (normalized.status === "declined") await clearActivityAnswers(admin, guest.id, guest.booking_id);
  else if (normalized.status === "accepted") await clampActivityPeople(admin, guest.id, normalized.partySize);
  return { ok: true };
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

export type ActivityAnswerResult = { ok: true } | { ok: false; error: "not_found" | "not_invited" | "closed" | "full" | "failed" };

/**
 * Public: a guest answers an activity through their secret link. The answer, capacity and "has it started"
 * checks all happen atomically in the database function (service role only), never in the browser.
 */
export async function answerActivity(token: string, activityId: string, response: "yes" | "no" | "maybe"): Promise<ActivityAnswerResult> {
  const admin = createSupabaseAdminClient();
  const guestId = await guestIdForToken(admin, typeof token === "string" ? token : "");
  if (!guestId) return { ok: false, error: "not_found" };
  if (typeof activityId !== "string" || !["yes", "no", "maybe"].includes(response)) return { ok: false, error: "not_found" };

  const { data: g } = await admin.from("portal_guests" as never).select("status, party_size, booking_id").eq("id", guestId).maybeSingle();
  const guest = g as unknown as { status: string; party_size: number; booking_id: string } | null;
  if (!guest || guest.status === "declined" || !(await portalEnabledForBooking(admin, guest.booking_id))) return { ok: false, error: "not_found" };

  const { data, error } = await admin.rpc("portal_activity_answer" as never, {
    p_guest_id: guestId,
    p_activity_id: activityId,
    p_response: response,
    p_people: guest.status === "accepted" ? guest.party_size : 1,
  } as never);
  if (error) return { ok: false, error: "failed" };
  const status = data as unknown as string;
  return status === "ok" ? { ok: true } : { ok: false, error: (["not_found", "not_invited", "closed", "full"].includes(status) ? status : "failed") as "not_found" | "not_invited" | "closed" | "full" | "failed" };
}
