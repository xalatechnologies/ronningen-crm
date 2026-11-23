import type { UserRole } from "@/constants/roles";
import {
  assignableRoles,
  canChangeMemberRole,
  canRemoveMember,
} from "@/lib/organizations/organization-permissions";

export type TeamMemberRow = {
  id: string;
  userId: string;
  role: UserRole;
  createdAtIso: string;
  fullName: string | null;
  email: string | null;
};

/** Name to show for a member: full name, else email, else the fallback text. */
export function memberDisplayName(member: Pick<TeamMemberRow, "fullName" | "email">, fallback: string): string {
  return member.fullName?.trim() || member.email?.trim() || fallback;
}

/** What the signed-in person may do with one row. Nobody changes or removes themselves here. */
export function memberActions(actor: UserRole | null, member: TeamMemberRow, isSelf: boolean) {
  return {
    mayChangeRole: !isSelf && canChangeMemberRole(actor, member.role),
    mayRemove: !isSelf && canRemoveMember(actor, member.role),
  };
}

export type MemberGuardError = "locked" | "last_owner" | "self";

/** Why a role change must be refused, or null when it may go ahead. */
export function roleChangeError(
  actor: UserRole | null,
  member: TeamMemberRow,
  nextRole: UserRole,
  ownerCount: number,
): MemberGuardError | null {
  if (!canChangeMemberRole(actor, member.role) || !assignableRoles(actor).includes(nextRole)) return "locked";
  if (member.role === "owner" && ownerCount <= 1 && nextRole !== "owner") return "last_owner";
  return null;
}

/** Why a removal must be refused, or null when it may go ahead. */
export function removeError(
  actor: UserRole | null,
  member: TeamMemberRow,
  ownerCount: number,
  isSelf: boolean,
): MemberGuardError | null {
  if (!canRemoveMember(actor, member.role)) return "locked";
  if (member.role === "owner" && ownerCount <= 1) return "last_owner";
  if (isSelf) return "self";
  return null;
}
