import type { UserRole } from "@/constants/roles";
import {
  canAccessRoute as orgCanAccessRoute,
  canManageAssets as orgCanManageAssets,
  canManageBookings as orgCanManageBookings,
  canManageFinance as orgCanManageFinance,
  isAdmin as orgIsAdmin,
  isOwner as orgIsOwner,
} from "@/lib/organizations/organization-permissions";

export function isOwner(role: UserRole | undefined | null): boolean {
  return orgIsOwner(role ?? null);
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return orgIsAdmin(role ?? null);
}

export function canManageFinance(role: UserRole | undefined | null): boolean {
  return orgCanManageFinance(role ?? null);
}

export function canManageBookings(role: UserRole | undefined | null): boolean {
  return orgCanManageBookings(role ?? null);
}

export function canManageAssets(role: UserRole | undefined | null): boolean {
  return orgCanManageAssets(role ?? null);
}

export function canAccessRoute(
  role: UserRole | undefined | null,
  pathname: string,
): boolean {
  return orgCanAccessRoute(role ?? null, pathname);
}
