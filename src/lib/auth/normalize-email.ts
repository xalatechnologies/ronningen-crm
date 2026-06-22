const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;

/**
 * Normalizes user-entered email before validation and auth API calls.
 * Strips whitespace, zero-width characters, and lowercases.
 */
export function normalizeEmail(value: string): string {
  return value
    .trim()
    .replace(ZERO_WIDTH_CHARS, "")
    .normalize("NFC")
    .toLowerCase();
}
