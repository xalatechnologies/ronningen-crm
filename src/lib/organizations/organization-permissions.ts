import type { UserRole } from "@/constants/roles";

export function isOwner(role: UserRole | null): boolean {
  return role === "owner";
}

export function isAdmin(role: UserRole | null): boolean {
  return role === "admin";
}

export function canManageFinance(role: UserRole | null): boolean {
  if (!role) return false;
  return role === "owner" || role === "admin" || role === "accountant";
}

export function canManageBookings(role: UserRole | null): boolean {
  if (!role) return false;
  return role === "owner" || role === "admin" || role === "manager";
}

export function canManageAssets(role: UserRole | null): boolean {
  return canManageBookings(role);
}

export function canManageMembers(role: UserRole | null): boolean {
  if (!role) return false;
  return role === "owner" || role === "admin";
}

/**
 * Roles `actor` may hand out on the Team page. «owner» is never assigned here
 * (ownership transfer is a separate, deliberate flow).
 */
export function assignableRoles(actor: UserRole | null): UserRole[] {
  if (actor === "owner") return ["admin", "manager", "accountant", "viewer"];
  if (actor === "admin") return ["manager", "accountant", "viewer"];
  return [];
}

/** May `actor` change the role of a member who currently has role `target`? */
export function canChangeMemberRole(
  actor: UserRole | null,
  target: UserRole | null,
): boolean {
  return target != null && assignableRoles(actor).includes(target);
}

/** May `actor` remove a member with role `target`? Owners can remove anyone; admins only below them. */
export function canRemoveMember(
  actor: UserRole | null,
  target: UserRole | null,
): boolean {
  if (!actor || !target) return false;
  if (actor === "owner") return true;
  return canChangeMemberRole(actor, target);
}

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  void pathname;
  return true;
}
