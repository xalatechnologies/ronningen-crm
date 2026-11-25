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

/** 'login' codes sign an existing account in; 'signup' codes prove a mailbox before an account exists. Never interchangeable. */
export type LoginCodePurpose = "login" | "signup";

type LoginCodeRow = {
  id: string;
  code_hash: string;
};

/** The table is new and not yet in the generated types. */
function codesTable() {
  return createSupabaseAdminClient().from("login_codes" as never);
}

/** Escapes the wildcards of a LIKE pattern so an e-mail is matched literally. */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** True when an account (profile) already exists for the e-mail, ignoring case. */
export async function emailHasAccount(email: string): Promise<boolean> {
  const { data } = await createSupabaseAdminClient()
    .from("profiles")
    .select("id")
    .ilike("email", likeLiteral(email))
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** Stores a new code for the e-mail and purpose, or returns null when too many were requested this hour. */
async function createCode(email: string, purpose: LoginCodePurpose): Promise<string | null> {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await codesTable()
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("purpose", purpose)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= LOGIN_CODE_MAX_REQUESTS_PER_HOUR) return null;

  // A new code kills the older ones of the same purpose, and nothing older than a day is kept.
  await codesTable()
    .update({ used_at: new Date().toISOString() } as never)
    .eq("email", email)
    .eq("purpose", purpose)
    .is("used_at", null);
  await codesTable().delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());

  const id = randomUUID();
  const code = generateOtpCode();
  const { error } = await codesTable().insert({
    id,
    email,
    purpose,
    code_hash: hashLoginCode(id, code),
    expires_at: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60_000).toISOString(),
  } as never);
  if (error) throw error;
  return code;
}

/**
 * Creates a code for an e-mail that belongs to an account. Returns the plain code to e-mail,
 * or null when nothing should be sent (unknown account, or too many requests this hour).
 * Callers must answer identically either way so the response never reveals whether an account exists.
 */
export async function issueLoginCode(email: string): Promise<string | null> {
  if (!(await emailHasAccount(email))) return null;
  return createCode(email, "login");
}

/** Creates a signup code for an e-mail with no account yet. Null when too many were requested this hour. */
export async function issueSignupCode(email: string): Promise<string | null> {
  return createCode(email, "signup");
}

/** Checks a code against the newest unused, unexpired one for the e-mail and purpose. Single use. */
async function consumeCode(email: string, code: string, purpose: LoginCodePurpose): Promise<boolean> {
  const { data } = await codesTable()
    .select("id, code_hash")
    .eq("email", email)
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as unknown as LoginCodeRow | null;
  if (!row) return false;

  // Count the attempt first, atomically: parallel guesses cannot all read the same old count.
  const { data: attempt } = await createSupabaseAdminClient().rpc("login_code_register_attempt" as never, {
    p_id: row.id,
    p_max: LOGIN_CODE_MAX_ATTEMPTS,
  } as never);
  if (typeof attempt !== "number") return false;

  if (!safeEqualHex(hashLoginCode(row.id, code), row.code_hash)) return false;

  // Claim atomically so one code can only log in once.
  const { data: claimed } = await codesTable()
    .update({ used_at: new Date().toISOString() } as never)
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  return ((claimed as unknown[] | null)?.length ?? 0) > 0;
}

/** Checks a sign-in code. Single use. */
export const consumeLoginCode = (email: string, code: string) => consumeCode(email, code, "login");

/** Checks a signup code. Single use. */
export const consumeSignupCode = (email: string, code: string) => consumeCode(email, code, "signup");
