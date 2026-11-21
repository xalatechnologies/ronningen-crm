import { partnerLabelToCategoryLocalized } from "@/features/customers/lib/partner-categories";
import type { Translator } from "@/i18n/types";
import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { PartnerFormInput } from "@/lib/validations";

export type PartnerPayload = {
  category: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

/** Form values to database columns: the typed category label becomes the stored preset value. */
export function toPartnerPayload(data: PartnerFormInput, t: Translator): PartnerPayload {
  return {
    category: partnerLabelToCategoryLocalized(data.category, t),
    name: data.name,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    notes: data.notes?.trim() || null,
  };
}

export async function createPartner(supabase: TenantSupabaseClient, organizationId: string, payload: PartnerPayload) {
  const { error } = await supabase.from("partners").insert({ ...payload, organization_id: organizationId });
  return { error };
}

/** Scoped to the organization, so a guessed id from another tenant changes nothing. */
export async function updatePartner(
  supabase: TenantSupabaseClient,
  organizationId: string,
  partnerId: string,
  payload: PartnerPayload,
) {
  const { error } = await supabase
    .from("partners")
    .update(payload)
    .eq("id", partnerId)
    .eq("organization_id", organizationId);
  return { error };
}

export async function deletePartner(supabase: TenantSupabaseClient, organizationId: string, partnerId: string) {
  const { error } = await supabase
    .from("partners")
    .delete()
    .eq("id", partnerId)
    .eq("organization_id", organizationId);
  return { error };
}
