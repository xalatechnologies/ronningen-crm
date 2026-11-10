import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { getSupabasePublicEnvForClient } from "@/lib/supabase/public-env";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Set it in .env.local and restart npm run dev.",
    );
  }

  const { url } = getSupabasePublicEnvForClient();
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL mangler.");
  }

  if (!adminClient) {
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      getSupabasePublicEnvForClient().url,
  );
}
