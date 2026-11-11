import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { processLock } from "@supabase/auth-js";

import type { Database } from "@/types/database.types";
import {
  getSupabasePublicEnvForClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/public-env";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REMEMBER_COOKIE,
  isRemembered,
  withSessionLifetime,
} from "@/lib/auth/session-lifetime";

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
    // Same 30-day / browser-session lifetime as the server, so a client-side token refresh
    // cannot turn a session cookie into a long-lived one.
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        return parseCookieHeader(document.cookie).map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;
        const remember = isRemembered(
          parseCookieHeader(document.cookie).find((c) => c.name === REMEMBER_COOKIE)?.value,
        );
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serializeCookieHeader(
            name,
            value,
            withSessionLifetime(options, remember),
          );
        });
      },
    },
  });
  return browserClient;
}
