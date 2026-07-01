import { getCachedServerOrganizationContext } from "./cached-organization-context";
import { getDefaultT } from "@/lib/i18n/default-messages";

export async function requireServerOrganizationId(): Promise<string> {
  const context = await getCachedServerOrganizationContext();
  if (!context.organizationId) {
    throw new Error(getDefaultT()("organizations.noActiveOrg"));
  }
  return context.organizationId;
}
