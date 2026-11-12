export const PORTAL_INVITE_TTL_DAYS = 14;

export type PortalInviteState = "pending" | "accepted" | "revoked" | "expired";

export type PortalAccountRow = {
  id: string;
  organization_id: string;
  booking_id: string;
  customer_id: string;
  email: string;
  user_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export function portalInviteExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + PORTAL_INVITE_TTL_DAYS * 86_400_000).toISOString();
}

export function portalInviteState(
  row: Pick<PortalAccountRow, "accepted_at" | "revoked_at" | "expires_at">,
  now: Date = new Date(),
): PortalInviteState {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "pending";
}

/** A portal invitation is only sent for an org that switched the portal on, and only automatically if asked. */
export function shouldAutoInvite(org: { portal_enabled: boolean; portal_auto_invite: boolean }): boolean {
  return org.portal_enabled && org.portal_auto_invite;
}
