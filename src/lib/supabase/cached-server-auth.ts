import { cache } from "react";

import type { User } from "@supabase/supabase-js";

import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

export const getCachedServerAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await getCachedServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
});
