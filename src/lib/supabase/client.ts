import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.supabase-ssr-build-placeholder";

let missingPublicEnvWarned = false;

/** True when real project URL and anon key are present (not build placeholders). */
export function isSupabasePublicConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  if (url === PLACEHOLDER_URL) return false;
  if (key === PLACEHOLDER_ANON) return false;
  return true;
}

/**
 * Browser client. Uses non-empty placeholders when env is missing so local
 * builds and prerender can complete; configure real keys for runtime auth.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    if (!missingPublicEnvWarned) {
      missingPublicEnvWarned = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — using placeholder for SSR/build",
      );
    }
  }
  return createBrowserClient<Database>(
    url && url.length > 0 ? url : PLACEHOLDER_URL,
    key && key.length > 0 ? key : PLACEHOLDER_ANON,
  );
}
