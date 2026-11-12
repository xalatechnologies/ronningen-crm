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

/**
 * An e-mail change means the old address must not keep access: every link is revoked and the guest goes
 * back to "not sent" with no answer (it was given by whoever held the old address).
 */
export async function resetGuestInvitation(admin: Admin, guestId: string): Promise<void> {
  await tokens(admin).delete().eq("guest_id", guestId);
  await admin
    .from("portal_guests" as never)
    .update({
      status: "not_sent",
      party_size: 1,
      diet: [],
      diet_consent_at: null,
      responded_at: null,
      last_sent_at: null,
      send_count: 0,
      rsvp_count: 0,
      last_rsvp_at: null,
    } as never)
    .eq("id", guestId);
}
