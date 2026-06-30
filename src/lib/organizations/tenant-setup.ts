import type { UserRole } from "@/constants/roles";
import { canManageMembers } from "@/lib/organizations/organization-permissions";

export const TENANT_ONBOARDING_PATH = "/app/onboarding";
export const TENANT_ACCOUNT_PATH = "/app/settings/account";
export const TENANT_SETUP_ORGANIZATION_PATH = "/app/settings/organization";
export const TENANT_SETUP_LOKALER_PATH = "/app/settings/lokaler";

export type TenantSetupProfileFields = {
  org_number: string | null;
  address_line1: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export type TenantSetupStep = "organization" | "lokaler";

export function isOrganizationProfileComplete(
  profile: TenantSetupProfileFields,
): boolean {
  const hasOrgNumber = Boolean(profile.org_number?.trim());
  const hasAddress = Boolean(
    profile.address_line1?.trim() && profile.city?.trim(),
  );
  const hasContact = Boolean(
    profile.contact_email?.trim() || profile.contact_phone?.trim(),
  );

  return hasOrgNumber && hasAddress && hasContact;
}

export function resolveTenantSetupStep(input: {
  profileComplete: boolean;
  propertyCount: number;
}): TenantSetupStep | null {
  if (!input.profileComplete) return "organization";
  if (input.propertyCount === 0) return "lokaler";
  return null;
}

export function tenantSetupPathForStep(step: TenantSetupStep | null): string | null {
  if (step === "organization") return TENANT_SETUP_ORGANIZATION_PATH;
  if (step === "lokaler") return TENANT_SETUP_LOKALER_PATH;
  return null;
}

/** Owners and admins complete org profile and initial lokaler. */
export function shouldEnforceTenantSetup(role: UserRole | null): boolean {
  return canManageMembers(role);
}

export function isAllowedDuringTenantSetup(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/app";

  return (
    normalized === TENANT_SETUP_ORGANIZATION_PATH ||
    normalized.startsWith(`${TENANT_SETUP_ORGANIZATION_PATH}/`) ||
    normalized === TENANT_SETUP_LOKALER_PATH ||
    normalized.startsWith(`${TENANT_SETUP_LOKALER_PATH}/`) ||
    normalized === TENANT_ACCOUNT_PATH ||
    normalized.startsWith(`${TENANT_ACCOUNT_PATH}/`) ||
    normalized === TENANT_ONBOARDING_PATH
  );
}

export function shouldResolveAuthDestination(redirectPath: string): boolean {
  return redirectPath === "/app" || redirectPath === "/app/dashboard";
}
