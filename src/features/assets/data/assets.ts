import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { AssetFormInput } from "@/lib/validations";

export type AssetPayload = {
  property_id: string;
  name: string;
  quantity: number;
  value: number;
  condition: string | null;
  insurance_status: string | null;
};

/** Form values to database columns: trims text and turns empty condition or insurance into null. */
export function toAssetPayload(data: AssetFormInput): AssetPayload {
  return {
    property_id: data.propertyId,
    name: data.name.trim(),
    quantity: data.quantity,
    value: data.value,
    condition: data.condition?.trim() || null,
    insurance_status: data.insuranceStatus?.trim() || null,
  };
}

export async function updateAsset(supabase: TenantSupabaseClient, id: string, payload: AssetPayload) {
  const { error } = await supabase.from("assets").update(payload).eq("id", id);
  return { error };
}

export async function createAsset(supabase: TenantSupabaseClient, organizationId: string, payload: AssetPayload) {
  const { error } = await supabase.from("assets").insert({ ...payload, organization_id: organizationId });
  return { error };
}

export async function deleteAsset(supabase: TenantSupabaseClient, id: string) {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  return { error };
}
