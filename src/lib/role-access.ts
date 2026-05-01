import type { UserRole } from "@/constants/roles";

export function isOwner(role: UserRole | undefined | null): boolean {
  return role === "owner";
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

export function canManageFinance(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === "owner" || role === "admin" || role === "accountant";
}

export function canManageBookings(role: UserRole | undefined | null): boolean {
  if (!role) return false;
  return role === "owner" || role === "admin";
}

/** Same RLS as `owner_admin_modify_assets`. */
export function canManageAssets(role: UserRole | undefined | null): boolean {
  return canManageBookings(role);
}

/**
 * Central hook for route-level authorization. All roles currently pass;
 * refine per pathname as the product matures.
 */
export function canAccessRoute(
  role: UserRole | undefined | null,
  pathname: string,
): boolean {
  if (!role) return false;
  void pathname;
  return true;
}
