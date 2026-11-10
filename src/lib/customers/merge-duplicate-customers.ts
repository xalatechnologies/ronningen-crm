import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/constants/roles";
import { normalizeCustomerEmail } from "@/lib/customers/customer-identity";
import { getDefaultT } from "@/lib/i18n/default-messages";
import type { Database } from "@/types/database.types";

type CustomerRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export { normalizeCustomerEmail as normCustomerEmail };

/**
 * Auto-merge key for the optional admin merge tool: normalized email only.
 * Create paths must not use this — staff reservations always insert a new
 * customer unless an existing customer is explicitly selected.
 */
export function customerMergeKey(c: Pick<CustomerRow, "email">) {
  const e = normalizeCustomerEmail(c.email);
  return e ? (`e:${e}` as const) : null;
}

export type MergeDuplicateCustomersResult =
  | { ok: true; mergedGroups: number; deletedRows: number }
  | { ok: false; error: string };

/**
 * Merges duplicate customer rows that share the same normalized email.
 * Keeps the newest row by created_at. Reassigns bookings/inquiries/accommodation,
 * then deletes duplicate customers.
 * Requires an authenticated owner or admin org member on the given client.
 * Does not call revalidatePath (safe during RSC render).
 */
export async function mergeDuplicateCustomersWithClient(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  memberRole: UserRole | null,
): Promise<MergeDuplicateCustomersResult> {
  if (!memberRole || (memberRole !== "owner" && memberRole !== "admin")) {
    const t = getDefaultT();
    return {
      ok: false,
      error: t("serverErrors.customers.mergeRequiresAdmin"),
    };
  }

  const { data: rows, error: fetchErr } = await supabase
    .from("customers")
    .select("id, email, phone, created_at")
    .eq("organization_id", organizationId);

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }
  if (!rows?.length) {
    return { ok: true, mergedGroups: 0, deletedRows: 0 };
  }

  const groups = new Map<string, CustomerRow[]>();
  for (const r of rows) {
    const key = customerMergeKey(r);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  let mergedGroups = 0;
  let deletedRows = 0;

  for (const [, list] of groups) {
    if (list.length < 2) continue;
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id.localeCompare(a.id);
    });
    const [keeper, ...victims] = list;
    if (!keeper) continue;
    mergedGroups += 1;

    for (const v of victims) {
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({ customer_id: keeper.id })
        .eq("customer_id", v.id)
        .eq("organization_id", organizationId);
      if (bookingErr) {
        return { ok: false, error: bookingErr.message };
      }
      const { error: inquiryErr } = await supabase
        .from("booking_inquiries")
        .update({ customer_id: keeper.id })
        .eq("customer_id", v.id)
        .eq("organization_id", organizationId);
      if (inquiryErr) {
        return { ok: false, error: inquiryErr.message };
      }
      const { error: accommodationErr } = await supabase
        .from("accommodation_reservations")
        .update({ customer_id: keeper.id })
        .eq("customer_id", v.id)
        .eq("organization_id", organizationId);
      if (accommodationErr) {
        return { ok: false, error: accommodationErr.message };
      }
      const { error: delErr } = await supabase
        .from("customers")
        .delete()
        .eq("id", v.id)
        .eq("organization_id", organizationId);
      if (delErr) {
        return { ok: false, error: delErr.message };
      }
      deletedRows += 1;
    }
  }

  return { ok: true, mergedGroups, deletedRows };
}
