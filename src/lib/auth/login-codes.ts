import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { generateOtpCode, safeEqualHex, sha256Hex } from "@/lib/contracts/crypto";
import { randomUUID } from "node:crypto";

export { LOGIN_CODE_TTL_MINUTES } from "@/lib/auth/login-code-config";
import { LOGIN_CODE_TTL_MINUTES } from "@/lib/auth/login-code-config";
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_MAX_REQUESTS_PER_HOUR = 5;

/** Salted with the row id so equal codes never share a hash. */
export function hashLoginCode(id: string, code: string): string {
  return sha256Hex(`${id}:${code}`);
}

type LoginCodeRow = {
  id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  used_at: string | null;
};

/** The table is new and not yet in the generated types. */
function codesTable() {
  return createSupabaseAdminClient().from("login_codes" as never);
}

/**
 * Creates a code for an e-mail that belongs to an account. Returns the plain code to e-mail,
 * or null when nothing should be sent (unknown account, or too many requests this hour).
 * Callers must answer identically either way so the response never reveals whether an account exists.
 */
export async function issueLoginCode(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (!profile) return null;

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await codesTable()
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= LOGIN_CODE_MAX_REQUESTS_PER_HOUR) return null;

  const id = randomUUID();
  const code = generateOtpCode();
  const { error } = await codesTable().insert({
    id,
    email,
    code_hash: hashLoginCode(id, code),
    expires_at: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60_000).toISOString(),
  } as never);
  if (error) throw error;
  return code;
}

/** Checks a code against the newest unused, unexpired one for the e-mail. Single use. */
export async function consumeLoginCode(email: string, code: string): Promise<boolean> {
  const { data } = await codesTable()
    .select("id, code_hash, expires_at, attempts, used_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as unknown as LoginCodeRow | null;
  if (!row || row.attempts >= LOGIN_CODE_MAX_ATTEMPTS) return false;

  if (!safeEqualHex(hashLoginCode(row.id, code), row.code_hash)) {
    await codesTable()
      .update({ attempts: row.attempts + 1 } as never)
      .eq("id", row.id);
    return false;
  }

  // Claim atomically so one code can only log in once.
  const { data: claimed } = await codesTable()
    .update({ used_at: new Date().toISOString() } as never)
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  return ((claimed as unknown[] | null)?.length ?? 0) > 0;
}
