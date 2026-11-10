import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateSecretToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isSecretTokenShape(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value);
}

export function hashSecretToken(token: string): string {
  return sha256Hex(token);
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string, sessionTokenHash: string): string {
  return sha256Hex(`${sessionTokenHash}:${code}`);
}

export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Canonical JSON for content hashing (sorted keys, no undefined). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item !== undefined) out[key] = sortValue(item);
  }
  return out;
}

export function contentHashFromDocument(document: unknown): string {
  return sha256Hex(stableStringify(document));
}
