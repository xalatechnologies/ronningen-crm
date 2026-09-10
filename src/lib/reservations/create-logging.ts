/**
 * PII-safe logging helpers for reservation creates.
 * Never log names, emails, phones, or addresses.
 */

/** Short non-reversible-looking org id token for structured logs (not a crypto hash). */
export function hashOrgIdForLog(orgId: string): string {
  if (!orgId) return "unknown";
  let h = 0;
  for (let i = 0; i < orgId.length; i++) {
    h = (h * 31 + orgId.charCodeAt(i)) | 0;
  }
  return `org_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export type ReservationCreateLogEvent = {
  event: "reservation.create";
  entityType: "booking" | "inquiry" | "accommodation" | "customer";
  orgIdHash: string;
  clientRequestId: string | null;
  reused: boolean;
  durationMs: number;
  ok: boolean;
  errorCode?: string;
};
