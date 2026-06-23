import { SettingsHub } from "@/components/settings/settings-hub";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [supabase, orgId] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireServerOrganizationId(),
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

  return (
    <SettingsHub
      propertyCount={propertyCount ?? 0}
      teamCount={teamCount ?? 0}
    />
  );
}
