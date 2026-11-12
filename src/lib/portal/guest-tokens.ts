import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { generateSecretToken, hashSecretToken, isSecretTokenShape } from "@/lib/contracts/crypto";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const tokens = (a: Admin) => a.from("portal_guest_tokens" as never);

/** A fresh secret link for a guest. Only its SHA-256 is stored; earlier links (older e-mails) stay valid. */
export async function issueGuestToken(admin: Admin, guestId: string): Promise<string | null> {
  const token = generateSecretToken();
  const { error } = await tokens(admin).insert({ token_hash: hashSecretToken(token), guest_id: guestId } as never);
  return error ? null : token;
}

export async function revokeToken(admin: Admin, token: string): Promise<void> {
  await tokens(admin).delete().eq("token_hash", hashSecretToken(token));
}

/** The guest a link belongs to, or null for anything unknown or malformed (callers show one generic message). */
export async function guestIdForToken(admin: Admin, token: string): Promise<string | null> {
  if (!isSecretTokenShape(token)) return null;
  const { data } = await tokens(admin).select("guest_id").eq("token_hash", hashSecretToken(token)).maybeSingle();
  return (data as { guest_id: string } | null)?.guest_id ?? null;
}

const invitees = (a: Admin) => a.from("portal_activity_invitees" as never);

/**
 * A guest who declines the main invitation is no longer attending anything: their answers are removed
 * (for "all" activities the row only held the answer; for "selected" activities the invitation stays).
 */
export async function clearActivityAnswers(admin: Admin, guestId: string, bookingId: string): Promise<void> {
  const { data: all } = await admin.from("portal_activities" as never).select("id").eq("booking_id", bookingId).eq("audience", "all");
  const allIds = ((all as unknown as { id: string }[] | null) ?? []).map((a) => a.id);
  if (allIds.length > 0) await invitees(admin).delete().eq("guest_id", guestId).in("activity_id", allIds);
  await invitees(admin).update({ response: null, people: null, responded_at: null } as never).eq("guest_id", guestId);
}

/** A smaller party frees the places the guest no longer needs (capacity counts people). */
export async function clampActivityPeople(admin: Admin, guestId: string, partySize: number): Promise<void> {
  const { data } = await invitees(admin).select("activity_id").eq("guest_id", guestId).eq("response", "yes").gt("people", partySize);
  for (const row of (data as unknown as { activity_id: string }[] | null) ?? []) {
    await invitees(admin).update({ people: partySize } as never).eq("activity_id", row.activity_id).eq("guest_id", guestId);
  }
}
