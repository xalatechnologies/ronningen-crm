export function requireOrganizationId(
  organizationId: string | null | undefined,
): string {
  if (!organizationId) {
    throw new Error("Ingen aktiv organisasjon. Velg eller opprett en organisasjon.");
  }
  return organizationId;
}
