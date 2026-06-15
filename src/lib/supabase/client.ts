import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/auth-js";

import type { Database } from "@/types/database.types";
import {
  getSupabasePublicEnvForClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/public-env";
import type { SupabaseClient } from "@supabase/supabase-js";

export { isSupabasePublicConfigured };

let missingPublicEnvWarned = false;
let browserClient: SupabaseClient<Database> | undefined;

/**
 * Browser client singleton. Uses in-process auth locking instead of the browser
 * Navigator LockManager to avoid steal/AbortError cascades in React Strict Mode.
 */
export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const { url, key } = getSupabasePublicEnvForClient();
  if (!isSupabasePublicConfigured()) {
    if (!missingPublicEnvWarned) {
      missingPublicEnvWarned = true;
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set — using placeholder for SSR/build",
      );
    }
  }
  browserClient = createBrowserClient<Database>(url, key, {
    auth: {
      lock: processLock,
    },
  });
  return browserClient;
}
