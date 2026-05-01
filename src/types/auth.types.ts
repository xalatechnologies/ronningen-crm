import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/constants/roles";

export type AuthUser = User;

export type AuthSessionPayload = {
  user: AuthUser | null;
  role: UserRole | null;
};
