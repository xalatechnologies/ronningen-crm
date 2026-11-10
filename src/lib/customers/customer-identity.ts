/**
 * Shared customer identity normalization for lookup / merge.
 *
 * Lookup keys:
 * - Explicit customer id only (staff picked an existing customer, or convert).
 * - Never auto-attach by email, phone, or name — same contact details on a new
 *   reservasjon/forespørsel create a new customer row so the typed name stays.
 */

export function normalizeCustomerEmail(email: string | null | undefined): string | null {
  const t = (email ?? "").trim().toLowerCase();
  return t.length > 0 ? t : null;
}

/**
 * Digits-only phone, with leading country code 47 stripped for NO mobiles.
 * "+47 966 65 001" and "96665001" → "96665001"
 */
export function normalizeCustomerPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0047") && digits.length >= 12) {
    digits = digits.slice(4);
  } else if (digits.startsWith("47") && digits.length >= 10) {
    digits = digits.slice(2);
  }
  return digits.length > 0 ? digits : null;
}

/** Stable UUID for idempotent reservation creates (one per form attempt). */
export function generateClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
