import {
  TeamMembersSection,
  type TeamMemberRow,
} from "@/components/settings/team-members-section";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { isUserRole } from "@/lib/validations";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const { t } = await getServerTranslation();
  const [supabase, { organizationId, role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    getCachedServerOrganizationContext(),
  ]);

  if (!organizationId || !role) {
    redirect("/app/onboarding");
  }

  if (!canManageMembers(role)) {
    redirect("/app/settings");
  }

  const orgId = organizationId;

  const { data: memberRows, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
        {t("appPages.settings.team.loadError", { error: error.message })}
      </div>
    );
  }

  const userIds = (memberRows ?? []).map((r) => r.user_id);
  const { data: profileRows } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, p] as const),
  );

  const members: TeamMemberRow[] = (memberRows ?? [])
    .map((row) => {
      const memberRole = isUserRole(row.role) ? row.role : null;
      if (!memberRole) return null;
      const p = profileById.get(row.user_id);
      return {
        id: row.id,
        userId: row.user_id,
        role: memberRole,
        createdAtIso: row.created_at,
        fullName: p?.full_name ?? null,
        email: p?.email ?? null,
      } satisfies TeamMemberRow;
    })
    .filter((m): m is TeamMemberRow => m !== null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="app-title">{t("appPages.settings.team.title")}</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          {t("appPages.settings.team.description")}
        </p>
      </div>
      <TeamMembersSection members={members} />
    </div>
  );
}
