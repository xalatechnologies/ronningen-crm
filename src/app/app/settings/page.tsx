import { SettingsHub } from "@/components/settings/settings-hub";
import { fetchSetupFacts } from "@/features/settings/data/setup-facts";
import { computeSetupProgress } from "@/features/settings/lib/setup-progress";
import { fetchCalendarFeedForOrg } from "@/lib/calendar/get-feed";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageMembers } from "@/lib/organizations/organization-permissions";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [supabase, orgId, { role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireServerOrganizationId(),
    getCachedServerOrganizationContext(),
  ]);

  const [{ count: propertyCount }, { count: teamCount }] = await Promise.all([
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  // The setup checklist is for owners and admins only, so nobody else triggers these extra reads.
  const setup = canManageMembers(role)
    ? computeSetupProgress(
        await fetchSetupFacts(supabase, orgId, { hasCalendarFeed: (await fetchCalendarFeedForOrg(orgId)) !== null }),
      )
    : null;

  return (
    <SettingsHub
      propertyCount={propertyCount ?? 0}
      teamCount={teamCount ?? 0}
      setup={setup}
    />
  );
}
