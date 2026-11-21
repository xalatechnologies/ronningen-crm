import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { TransactionFormInput } from "@/lib/validations";

export type TransactionPayload = {
  property_id: string;
  type: "income" | "expense";
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
};

/** Form values to database columns: trims text and turns an empty description into null. */
export function toTransactionPayload(data: TransactionFormInput): TransactionPayload {
  return {
    property_id: data.propertyId,
    type: data.type,
    category: data.category.trim(),
    description: data.description?.trim() || null,
    amount: data.amount,
    transaction_date: data.transactionDate,
  };
}

export async function updateTransaction(
  supabase: TenantSupabaseClient,
  id: string,
  payload: TransactionPayload,
) {
  const { error } = await supabase.from("transactions").update(payload).eq("id", id);
  return { error };
}

export async function createTransaction(
  supabase: TenantSupabaseClient,
  organizationId: string,
  payload: TransactionPayload,
) {
  const { error } = await supabase
    .from("transactions")
    .insert({ ...payload, organization_id: organizationId });
  return { error };
}

export async function deleteTransaction(supabase: TenantSupabaseClient, id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  return { error };
}
