"use client";

import {
  canManageAssets,
  canManageBookings,
  canManageFinance,
  canManageMembers,
  isAdmin,
  isOwner,
} from "@/lib/organizations/organization-permissions";
import { useCurrentOrganization } from "@/hooks/use-current-organization";

export function useOrganizationPermissions() {
  const { currentRole } = useCurrentOrganization();

  return {
    role: currentRole,
    isOwner: isOwner(currentRole),
    isAdmin: isAdmin(currentRole),
    canManageFinance: canManageFinance(currentRole),
    canManageBookings: canManageBookings(currentRole),
    canManageAssets: canManageAssets(currentRole),
    canManageMembers: canManageMembers(currentRole),
  };
}
