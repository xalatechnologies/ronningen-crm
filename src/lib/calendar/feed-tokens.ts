import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Generate a URL-safe 43-char token (~256 bits of entropy) suitable for
 * pasting into an iCalendar subscribe box. base64url avoids `+ / =` so the
 * value can go straight into a path segment without further encoding.
 */
export function generateFeedToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cheap sanity check for tokens coming off the URL before any DB round-trip. */
export function isValidFeedTokenShape(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value);
}
