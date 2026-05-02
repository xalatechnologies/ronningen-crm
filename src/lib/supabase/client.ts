import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import {
  getSupabasePublicEnvForClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/public-env";

export { isSupabasePublicConfigured };

let missingPublicEnvWarned = false;

/**
 * Browser client. Uses non-empty placeholders when env is missing so local
 * builds and prerender can complete; configure real keys for runtime auth.
 */
export function createBrowserSupabaseClient() {
  const { url, key } = getSupabasePublicEnvForClient();
  if (!isSupabasePublicConfigured()) {
    if (!missingPublicEnvWarned) {
      missingPublicEnvWarned = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set — using placeholder for SSR/build",
      );
    }
  }
  return createBrowserClient<Database>(url, key);
}
