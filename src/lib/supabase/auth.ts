import type { UserRole } from "@/constants/roles";
import { DEFAULT_USER_ROLE } from "@/constants/roles";
import { isUserRole } from "@/lib/validations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export function getRoleFromUser(user: User | null): UserRole | null {
  if (!user) return null;
  const fromMeta = user.user_metadata?.role;
  if (typeof fromMeta === "string" && isUserRole(fromMeta)) {
    return fromMeta;
  }
  return DEFAULT_USER_ROLE;
}

export async function fetchProfileRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }
  return isUserRole(data.role) ? data.role : DEFAULT_USER_ROLE;
}
