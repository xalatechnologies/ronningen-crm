import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/** One Supabase server client per RSC request (avoids repeated cookie reads). */
export const getCachedServerSupabaseClient = cache(createServerSupabaseClient);
