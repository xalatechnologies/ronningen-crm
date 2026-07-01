import { getDefaultT } from "@/lib/i18n/default-messages";

export function requireOrganizationId(
  organizationId: string | null | undefined,
): string {
  if (!organizationId) {
    throw new Error(getDefaultT()("organizations.noActiveOrgSelect"));
  }
  return organizationId;
}
