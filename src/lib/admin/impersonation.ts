import { cookies } from "next/headers";

import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/admin/supabase-admin";

export const IMPERSONATION_COOKIE = "platform_impersonation_org_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60;

export type ImpersonationContext = {
  organizationId: string;
  organizationName: string;
};

export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const admin = await getPlatformAdminContext();
  if (!admin) return null;

  const cookieStore = await cookies();
  const orgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!orgId) return null;
  if (!isSupabaseAdminConfigured()) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    if (!org) return null;

    return { organizationId: org.id, organizationName: org.name };
  } catch {
    return null;
  }
}

export function impersonationCookieOptions(orgId: string) {
  return {
    name: IMPERSONATION_COOKIE,
    value: orgId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export function clearImpersonationCookieOptions() {
  return {
    name: IMPERSONATION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
