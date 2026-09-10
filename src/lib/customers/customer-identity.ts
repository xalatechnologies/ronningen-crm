/** Shared customer identity normalization for lookup / merge. */

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
