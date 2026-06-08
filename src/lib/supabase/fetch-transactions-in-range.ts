import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const PAGE_SIZE = 1000;

export type TransactionMetricRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "amount" | "type" | "transaction_date"
>;

/**
 * Loads every transaction in [from, to] (inclusive on `transaction_date`).
 * PostgREST caps each response (often 1000 rows); this pages until exhausted.
 */
export async function fetchAllTransactionsInDateRange(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  fromYmd: string,
  toYmd: string,
): Promise<{ data: TransactionMetricRow[]; error: string | null }> {
  const rows: TransactionMetricRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, type, transaction_date")
      .eq("organization_id", organizationId)
      .gte("transaction_date", fromYmd)
      .lte("transaction_date", toYmd)
      .order("transaction_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { data: rows, error: error.message };
    }

    const batch = (data ?? []) as TransactionMetricRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { data: rows, error: null };
}
