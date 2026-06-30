import { PropertiesSection } from "@/components/properties/properties-section";
import type { PropertyListRow } from "@/components/properties/types";
import { TenantSetupBanner } from "@/components/settings/tenant-setup-banner";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { fetchTenantSetupStatus } from "@/lib/organizations/tenant-setup-queries";
import { canManageBookings } from "@/lib/role-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LokalerSettingsPage() {
  const [supabase, { organizationId, role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    getCachedServerOrganizationContext(),
  ]);

  if (!organizationId) {
    redirect("/app/onboarding");
  }

  const canEdit = canManageBookings(role);

  const [{ data: rawList, error }, setup] = await Promise.all([
    supabase
      .from("properties")
      .select("id, name, address, type, notes, updated_at")
      .eq("organization_id", organizationId)
      .order("name"),
    fetchTenantSetupStatus(supabase, organizationId, role),
  ]);

  const properties: PropertyListRow[] = (rawList ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type,
    notes: row.notes,
    updatedAtIso: row.updated_at,
  }));

  const setupMode = setup.step === "lokaler";

  return (
    <div className="flex flex-col gap-6">
      {setupMode ? <TenantSetupBanner step="lokaler" /> : null}
      <PropertiesSection
        properties={properties}
        canManage={canEdit}
        loadError={error?.message ?? null}
        setupMode={setupMode}
      />
    </div>
  );
}
