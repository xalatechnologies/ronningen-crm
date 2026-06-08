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

export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  void pathname;
  return true;
}
