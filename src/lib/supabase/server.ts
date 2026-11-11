import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";
import {
  REMEMBER_COOKIE,
  isRemembered,
  withSessionLifetime,
} from "@/lib/auth/session-lifetime";
import { getSupabasePublicEnvForClient } from "@/lib/supabase/public-env";

/**
 * `remember` is only passed by the login routes (the cookie they set is not yet readable on that
 * request); everywhere else the lifetime follows the «em_remember» cookie.
 */
export async function createServerSupabaseClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const remember = options?.remember ?? isRemembered(cookieStore.get(REMEMBER_COOKIE)?.value);
  const { url, key } = getSupabasePublicEnvForClient();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withSessionLifetime(options, remember)),
            );
          } catch {
            // Server Component — cookies may be read-only.
          }
        },
      },
    },
  );
}
