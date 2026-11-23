import type { TenantSupabaseClient } from "@/lib/queries/types";

import type { propertyFormToPayload } from "@/features/properties/lib/property-form";

export type PropertyPayload = ReturnType<typeof propertyFormToPayload>;

/** Postgres code for "row is still referenced by another table". */
export const FOREIGN_KEY_VIOLATION = "23503";

export type PropertyWriteResult = { ok: true } | { ok: false; message: string; inUse: boolean };

function toResult(error: { message: string; code?: string } | null): PropertyWriteResult {
  if (!error) return { ok: true };
  return { ok: false, message: error.message, inUse: error.code === FOREIGN_KEY_VIOLATION };
}

export async function createProperty(
  supabase: TenantSupabaseClient,
  organizationId: string,
  payload: PropertyPayload,
): Promise<PropertyWriteResult> {
  const { error } = await supabase.from("properties").insert({ ...payload, organization_id: organizationId });
  return toResult(error);
}

export async function updateProperty(
  supabase: TenantSupabaseClient,
  organizationId: string,
  id: string,
  payload: PropertyPayload,
): Promise<PropertyWriteResult> {
  const { error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", organizationId);
  return toResult(error);
}

export async function deleteProperty(
  supabase: TenantSupabaseClient,
  organizationId: string,
  id: string,
): Promise<PropertyWriteResult> {
  const { error } = await supabase.from("properties").delete().eq("id", id).eq("organization_id", organizationId);
  return toResult(error);
}
