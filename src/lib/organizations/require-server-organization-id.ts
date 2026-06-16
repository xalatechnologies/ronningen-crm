import { getCachedServerOrganizationContext } from "./cached-organization-context";

export async function requireServerOrganizationId(): Promise<string> {
  const context = await getCachedServerOrganizationContext();
  if (!context.organizationId) {
    throw new Error("Ingen aktiv organisasjon.");
  }
  return context.organizationId;
}
