import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type PlatformAdminContext = {
  userId: string;
  email: string | undefined;
};

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: isPlatformAdmin, error } = await supabase.rpc(
    "is_current_user_platform_admin",
  );

  if (error || !isPlatformAdmin) return null;

  return { userId: user.id, email: user.email };
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin");
  }

  const { data: isPlatformAdmin, error } = await supabase.rpc(
    "is_current_user_platform_admin",
  );

  if (error || !isPlatformAdmin) {
    redirect("/app");
  }

  return { userId: user.id, email: user.email };
}
