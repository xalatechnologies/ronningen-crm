"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MarkTipsSeenResult = { ok: true } | { ok: false; error: "unauthenticated" | "failed" };

/**
 * Saves on the signed-in user's own account that the welcome tour has been finished or closed.
 * It takes no arguments on purpose: the row is always the caller's own (from the session, never from the
 * request), and the database policy for profiles only lets a user update their own row as well.
 * The first timestamp is kept, so closing it again later changes nothing.
 */
export async function markTipsSeen(): Promise<MarkTipsSeenResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ tips_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("tips_seen_at", null);
  if (error) {
    console.error("[welcome-tour] could not save tips_seen_at", error.code);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}
