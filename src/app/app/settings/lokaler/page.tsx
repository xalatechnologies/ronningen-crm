import { PropertiesSection } from "@/components/properties/properties-section";
import type { PropertyListRow } from "@/components/properties/types";
import { canManageBookings } from "@/lib/role-access";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LokalerSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canEdit = canManageBookings(role);

  const { data: rawList, error } = await supabase
    .from("properties")
    .select("id, name, address, type, notes, updated_at")
    .eq("organization_id", orgId)
    .order("name");

  const properties: PropertyListRow[] = (rawList ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type,
    notes: row.notes,
    updatedAtIso: row.updated_at,
  }));

  return (
    <PropertiesSection
      properties={properties}
      canManage={canEdit}
      loadError={error?.message ?? null}
    />
  );
}
