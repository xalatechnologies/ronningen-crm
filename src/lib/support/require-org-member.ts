import type { UserRole } from "@/constants/roles";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OrgMemberContext = {
  userId: string;
  orgId: string;
  role: UserRole;
};

export async function requireOrgMember(): Promise<OrgMemberContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { organizationId, role } = await resolveServerOrganizationContext(supabase);

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  return { userId: user.id, orgId: organizationId, role };
}
