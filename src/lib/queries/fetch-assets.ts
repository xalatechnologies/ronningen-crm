import type { AssetListItem } from "@/components/assets/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import { canManageAssets } from "@/lib/role-access";
import type { UserRole } from "@/constants/roles";

type RawAsset = {
  id: string;
  property_id: string;
  name: string;
  quantity: number;
  value: number;
  condition: string | null;
  insurance_status: string | null;
  properties: { name: string } | null;
};

export type AssetsPageData = {
  assets: AssetListItem[];
  properties: { id: string; name: string }[];
  loadError: string | null;
  canManageAssets: boolean;
};

export async function fetchAssetsPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
  role: UserRole | null,
): Promise<AssetsPageData> {
  const canManageFromServer = canManageAssets(role);

  const { data: properties, error: pErr } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: rawList, error: aErr } = await supabase
    .from("assets")
    .select(
      "id, property_id, name, quantity, value, condition, insurance_status, properties(name)",
    )
    .eq("organization_id", orgId)
    .order("name", { ascending: true })
    .limit(10000);

  const loadError = pErr?.message ?? aErr?.message ?? null;

  const nameByProperty = new Map(
    (properties ?? []).map((p) => [p.id, p.name] as const),
  );

  const assets: AssetListItem[] = (rawList ?? []).map((row) => {
    const r = row as unknown as RawAsset;
    return {
      id: r.id,
      property_id: r.property_id,
      propertyName:
        r.properties?.name ?? nameByProperty.get(r.property_id) ?? null,
      name: r.name,
      quantity: Number(r.quantity),
      value: Number(r.value),
      condition: r.condition,
      insurance_status: r.insurance_status,
    };
  });

  return {
    assets,
    properties: properties ?? [],
    loadError,
    canManageAssets: canManageFromServer,
  };
}
