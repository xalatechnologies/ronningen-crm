/**
 * Supabase URL + public client key from env.
 * Supports legacy JWT anon key and new publishable key (`sb_publishable_...`).
 * @see https://supabase.com/docs/guides/getting-started/api-keys
 */

export const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
export const PLACEHOLDER_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.supabase-ssr-build-placeholder";

export function getSupabaseProjectUrl(): string | undefined {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return u && u.length > 0 ? u : undefined;
}

/** Prefer anon JWT; fall back to dashboard «Publishable» key. */
export function getSupabasePublicApiKey(): string | undefined {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (anon && anon.length > 0) return anon;
  if (publishable && publishable.length > 0) return publishable;
  return undefined;
}

export function isSupabasePublicConfigured(): boolean {
  const url = getSupabaseProjectUrl();
  const key = getSupabasePublicApiKey();
  if (!url || !key) return false;
  if (url === PLACEHOLDER_SUPABASE_URL) return false;
  if (key === PLACEHOLDER_SUPABASE_KEY) return false;
  return true;
}

export function getSupabasePublicEnvForClient(): {
  url: string;
  key: string;
} {
  const url = getSupabaseProjectUrl();
  const key = getSupabasePublicApiKey();
  return {
    url: url ?? PLACEHOLDER_SUPABASE_URL,
    key: key ?? PLACEHOLDER_SUPABASE_KEY,
  };
}
