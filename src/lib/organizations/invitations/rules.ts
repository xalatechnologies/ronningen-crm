import type { UserRole } from "@/constants/roles";
import { assignableRoles } from "@/lib/organizations/organization-permissions";

export const INVITATION_TTL_DAYS = 7;

export type InvitationState = "pending" | "accepted" | "revoked" | "expired";

export type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export function invitationExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 86_400_000).toISOString();
}

export function invitationState(
  row: Pick<InvitationRow, "accepted_at" | "revoked_at" | "expires_at">,
  now: Date = new Date(),
): InvitationState {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "pending";
}

/** Same hierarchy as the Team page: you can only invite roles you may hand out. */
export function canInviteRole(actor: UserRole | null, role: string): boolean {
  return assignableRoles(actor).includes(role as UserRole);
}
