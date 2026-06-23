import type { UserRole } from "@/constants/roles";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { redirect } from "next/navigation";

export type OrgMemberContext = {
  userId: string;
  orgId: string;
  role: UserRole;
};

export async function requireOrgMember(): Promise<OrgMemberContext> {
  const { userId, organizationId, role } =
    await getCachedServerOrganizationContext();

  if (!userId) redirect("/auth/login");

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  return { userId, orgId: organizationId, role };
}
