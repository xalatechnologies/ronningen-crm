import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/** Clears the session and performs a full navigation to login (avoids post-logout UI flash). */
export async function signOutToLogin(
  supabase: SupabaseClient<Database>,
  loginPath = "/auth/login",
): Promise<void> {
  await supabase.auth.signOut();
  window.location.assign(loginPath);
}
