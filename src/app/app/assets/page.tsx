import { AssetsSection } from "@/components/assets/assets-section";
import type { AssetListItem } from "@/components/assets/types";
import type { UserRole } from "@/constants/roles";
import { canManageAssets } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export default async function AssetsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canManageFromServer = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    canManageFromServer = canManageAssets(profile?.role as UserRole | undefined);
  }

  const { data: properties, error: pErr } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");

  const { data: rawList, error: aErr } = await supabase
    .from("assets")
    .select(
      "id, property_id, name, quantity, value, condition, insurance_status, properties(name)",
    )
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

  return (
    <AssetsSection
      assets={assets}
      properties={properties ?? []}
      loadError={loadError}
      canManageAssets={canManageFromServer}
    />
  );
}
