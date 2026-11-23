/** The address people paste into a calendar app. Always built from the origin the app runs on and the secret token. */
export function buildFeedUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/api/calendar/${token}/bookings.ics`;
}

const MASK_LENGTH = 20;

/** The feed address with the secret token replaced by dots, so it can sit on screen without giving access. */
export function maskFeedUrl(url: string): string {
  return url.replace(/calendar\/([^/]+)\//, (_match, token: string) => `calendar/${"•".repeat(Math.min(token.length, MASK_LENGTH))}/`);
}

/** Date and time for the feed facts, or null when there is no value or it is not a date. */
export function formatFeedTime(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    return null;
  }
}
