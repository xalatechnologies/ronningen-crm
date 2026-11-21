import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { CustomerUpsertFormInput } from "@/lib/validations";

export type CustomerProfilePayload = { name: string; phone: string | null; email: string | null };

/** Form values to database columns: trims text and turns empty phone or e-mail into null. */
export function toCustomerProfilePayload(data: CustomerUpsertFormInput): CustomerProfilePayload {
  return {
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
  };
}

/** Every write is scoped to the organization, so a guessed id from another tenant changes nothing. */
export async function updateCustomerProfile(
  supabase: TenantSupabaseClient,
  organizationId: string,
  customerId: string,
  payload: CustomerProfilePayload,
) {
  const { error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", customerId)
    .eq("organization_id", organizationId);
  return { error };
}

export async function updateCustomerNotes(
  supabase: TenantSupabaseClient,
  organizationId: string,
  customerId: string,
  notes: string | null,
) {
  const { error } = await supabase
    .from("customers")
    .update({ notes })
    .eq("id", customerId)
    .eq("organization_id", organizationId);
  return { error };
}
