import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildSeating, type SeatingGuest, type SeatingSettings, type SeatingTable, type TableWithGuests } from "./seating-rules";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** The couple's seating: tables with their guests, who has no table yet, and whether guests can see their table. */
export async function loadSeating(
  client: Client,
  bookingId: string,
  guests: readonly SeatingGuest[],
): Promise<{ tables: TableWithGuests[]; unassigned: SeatingGuest[]; settings: SeatingSettings }> {
  const [{ data: t }, { data: a }, { data: s }] = await Promise.all([
    client.from("seating_tables" as never).select("id, name, capacity").eq("booking_id", bookingId).order("created_at", { ascending: true }),
    client.from("seating_assignments" as never).select("guest_id, table_id").eq("booking_id", bookingId),
    client.from("seating_settings" as never).select("shared").eq("booking_id", bookingId).maybeSingle(),
  ]);
  const tables = (t as unknown as SeatingTable[] | null) ?? [];
  const assignments = new Map(((a as unknown as { guest_id: string; table_id: string }[] | null) ?? []).map((r) => [r.guest_id, r.table_id]));
  return { ...buildSeating(tables, assignments, guests), settings: { shared: Boolean((s as unknown as { shared: boolean } | null)?.shared) } };
}

export async function countSeatingTables(client: Client, bookingId: string): Promise<number> {
  const { count } = await client.from("seating_tables" as never).select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  return count ?? 0;
}

/**
 * The name of the table a guest sits at, or null: nothing is shown until the couple has switched sharing on and
 * the guest has a table. Only the name, never who else sits there. Any failure (also a database without the
 * seating tables yet) simply shows nothing.
 */
export async function loadGuestTable(guestId: string, bookingId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: s } = await admin.from("seating_settings" as never).select("shared").eq("booking_id", bookingId).maybeSingle();
  if (!(s as unknown as { shared: boolean } | null)?.shared) return null;
  const { data: a } = await admin.from("seating_assignments" as never).select("table_id").eq("guest_id", guestId).eq("booking_id", bookingId).maybeSingle();
  const tableId = (a as unknown as { table_id: string } | null)?.table_id;
  if (!tableId) return null;
  const { data: t } = await admin.from("seating_tables" as never).select("name").eq("id", tableId).eq("booking_id", bookingId).maybeSingle();
  return (t as unknown as { name: string } | null)?.name ?? null;
}
