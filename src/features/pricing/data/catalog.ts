import type { CatalogKind } from "@/features/pricing/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { PricingPackageFormInput } from "@/lib/validations";

export type CatalogPayload = {
  name: string;
  description: string | null;
  price: number;
  active: boolean;
};

/**
 * Form values to database columns. A package builds its description from the tagline and points
 * (`packageDescription`); a service keeps the free text from the form.
 */
export function toCatalogPayload(
  kind: CatalogKind,
  data: PricingPackageFormInput,
  packageDescription: string,
): CatalogPayload {
  return {
    name: data.name.trim(),
    description: kind === "packages" ? packageDescription || null : data.description?.trim() || null,
    price: data.price,
    active: data.active,
  };
}

// Note: these writes filter by id only and rely on Row Level Security for tenant isolation (unchanged behavior).
export async function updateCatalogItem(
  supabase: TenantSupabaseClient,
  kind: CatalogKind,
  id: string,
  payload: CatalogPayload,
) {
  const { error } = await supabase.from(kind).update(payload).eq("id", id);
  return { error };
}

export async function createCatalogItem(
  supabase: TenantSupabaseClient,
  kind: CatalogKind,
  organizationId: string,
  payload: CatalogPayload,
) {
  const { error } = await supabase.from(kind).insert({ ...payload, organization_id: organizationId });
  return { error };
}

export async function deleteCatalogItem(supabase: TenantSupabaseClient, kind: CatalogKind, id: string) {
  const { error } = await supabase.from(kind).delete().eq("id", id);
  return { error };
}
