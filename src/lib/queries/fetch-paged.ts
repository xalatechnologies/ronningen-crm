import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const PAGE_SIZE = 1000;

type RangeQueryOptions = {
  select: string;
  orderBy?: { column: string; ascending: boolean };
};

/**
 * Pages through a tenant-scoped table until all rows in [from, to] are loaded.
 */
export async function fetchAllRowsInDateRange<T>(
  supabase: SupabaseClient<Database>,
  table: "transactions" | "bookings",
  organizationId: string,
  dateColumn: string,
  fromYmd: string,
  toYmd: string,
  options: RangeQueryOptions,
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];
  let offset = 0;

  for (;;) {
    let query = supabase
      .from(table)
      .select(options.select)
      .eq("organization_id", organizationId)
      .gte(dateColumn, fromYmd)
      .lte(dateColumn, toYmd);

    if (options.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending,
      });
    }

    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { data: rows, error: error.message };
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return { data: rows, error: null };
}

export function rollingYearBounds(
  yearsBack: number,
  yearsForward = 1,
): { fromYmd: string; toYmd: string } {
  const now = new Date();
  const fromYmd = `${now.getFullYear() - yearsBack}-01-01`;
  const toYmd = `${now.getFullYear() + yearsForward}-12-31`;
  return { fromYmd, toYmd };
}
