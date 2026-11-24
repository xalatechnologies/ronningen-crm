import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGAL_DOCUMENTS } from "@/features/legal/lib/legal-documents";

/**
 * Saves that a user accepted every required agreement, at the current versions. Runs with the service role
 * (the table has no write access for normal users). Returns false when saving failed, so the caller can
 * refuse to keep an account that has no proof of acceptance.
 */
export async function recordAcceptances(admin: SupabaseClient, userId: string): Promise<boolean> {
  const rows = LEGAL_DOCUMENTS.map((d) => ({ user_id: userId, document: d.key, version: d.version }));
  const { error } = await admin.from("terms_acceptances").upsert(rows, { onConflict: "user_id,document,version", ignoreDuplicates: true });
  return !error;
}
