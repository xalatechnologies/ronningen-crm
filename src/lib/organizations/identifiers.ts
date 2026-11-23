/** Rules and formatting for the identifiers on an organization profile. Empty values are valid: the fields are optional. */

const digitsOnly = (value: string) => value.replace(/[\s.]/g, "");

/** Check digit with weights, modulus 11 (used by Norwegian organization numbers and account numbers). */
function mod11CheckDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce((total, weight, i) => total + Number(digits[i]) * weight, 0);
  const remainder = sum % 11;
  return remainder === 0 ? 0 : 11 - remainder;
}

export function isValidOrgNumber(value: string): boolean {
  const digits = digitsOnly(value.trim());
  if (digits === "") return true;
  if (!/^\d{9}$/.test(digits)) return false;
  return mod11CheckDigit(digits, [3, 2, 7, 6, 5, 4, 3, 2]) === Number(digits[8]);
}

/** An 11-digit Norwegian account number with a correct check digit, or an IBAN-like value. */
export function isValidBankAccount(value: string): boolean {
  const compact = value.trim().replace(/[\s.]/g, "");
  if (compact === "") return true;
  if (/^\d+$/.test(compact)) {
    return compact.length === 11 && mod11CheckDigit(compact, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) === Number(compact[10]);
  }
  return /^[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}$/.test(compact);
}

/** Norwegian postal code: four digits. */
export function isValidPostalCode(value: string): boolean {
  const v = value.trim();
  return v === "" || /^\d{4}$/.test(v);
}

/** "974760673" becomes "974 760 673". Anything that is not nine digits stays as the person typed it. */
export function formatOrgNumber(value: string): string {
  const digits = digitsOnly(value.trim());
  return /^\d{9}$/.test(digits) ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value;
}

/** "86011117947" becomes "8601.11.17947". Anything that is not 11 digits stays as the person typed it. */
export function formatBankAccount(value: string): string {
  const digits = digitsOnly(value.trim());
  return /^\d{11}$/.test(digits) ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}` : value;
}
