import "server-only";

import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

const WINDOW_SECONDS = 600;
const LIMITS = { request: 10, verify: 30 } as const;

/** First address of x-forwarded-for (set by the hosting proxy), else a shared bucket. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Only a hash of the IP is stored. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`login-code-ip:${ip}`).digest("hex");
}

/** Records a hit and tells whether this IP is still within the limit for the 10-minute window. Fails open on a database error. */
export async function allowLoginCodeIp(request: Request, kind: keyof typeof LIMITS): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient().rpc("login_code_ip_allow" as never, {
    p_ip_hash: hashIp(clientIp(request.headers)),
    p_kind: kind,
    p_max: LIMITS[kind],
    p_window_seconds: WINDOW_SECONDS,
  } as never);
  if (error) {
    console.error("[auth/login-code-ip]", error.message);
    return true;
  }
  return data !== false;
}
