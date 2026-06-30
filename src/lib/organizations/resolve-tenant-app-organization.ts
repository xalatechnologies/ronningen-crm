import { resolveCurrentOrganization } from "@/lib/organizations/organization-queries";
import type { OrganizationMembership } from "@/lib/organizations/types";

export function resolveTenantAppOrganization(
  memberships: OrganizationMembership[],
  preferredOrganizationId: string | null,
): OrganizationMembership | null {
  if (memberships.length === 0) {
    return null;
  }

  const resolved = resolveCurrentOrganization(
    memberships,
    preferredOrganizationId,
  );

  if (!resolved.organizationId || !resolved.organization || !resolved.role) {
    return null;
  }

  return (
    memberships.find(
      (membership) => membership.organizationId === resolved.organizationId,
    ) ?? null
  );
}
