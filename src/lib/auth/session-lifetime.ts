import type { CookieOptions } from "@supabase/ssr";

/** Set at login from the «Hold meg innlogget» checkbox. A missing cookie counts as remembered. */
export const REMEMBER_COOKIE = "em_remember";
export const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function isRemembered(value: string | undefined | null): boolean {
  return value !== "0";
}

/**
 * Applies the session lifetime to a Supabase auth cookie: 30 days when remembered, otherwise a
 * browser-session cookie. Cookie deletions (maxAge 0 / past expiry) are passed through untouched.
 */
export function withSessionLifetime(
  options: CookieOptions | undefined,
  remember: boolean,
  now: number = Date.now(),
): CookieOptions {
  const next: CookieOptions = { ...(options ?? {}) };
  const deleting =
    next.maxAge === 0 || (next.expires instanceof Date && next.expires.getTime() <= now);
  if (deleting) return next;

  delete next.expires;
  if (remember) next.maxAge = REMEMBER_MAX_AGE_SECONDS;
  else delete next.maxAge;
  return next;
}
