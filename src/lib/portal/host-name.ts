import { containsLink } from "./invite-rules";

/**
 * The host's name appears in the e-mail sender and subject, so it is held to a strict allowlist: letters,
 * spaces and a few name punctuation marks. Digits (phone numbers), "@", ":", "/" and the like are removed, and
 * anything that still looks like a link falls back to the venue's name. Never free text from the account form.
 */
export function sanitizeHostName(raw: string, fallback: string): string {
  const cleaned = (raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}'’ .&-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (cleaned.length < 2 || containsLink(cleaned) || /(.)\1{5,}/.test(cleaned)) return fallback;
  return cleaned;
}
