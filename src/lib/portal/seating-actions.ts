"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { seatingSettingsSchema, tableInputSchema, type SeatingSettings, type TableInput } from "./seating-rules";

export type SeatingResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "not_found" | "limit" | "failed" };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
const tables = (c: Client) => c.from("seating_tables" as never);
const refresh = () => revalidatePath("/portal", "layout");
const uuid = z.string().uuid();

/** Creates or edits one table. The booking comes from the session; RLS, column grants and checks enforce it again. */
export async function saveSeatingTable(input: TableInput): Promise<SeatingResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = tableInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, name, capacity } = parsed.data;
  const supabase = await createServerSupabaseClient();

  if (id) {
    const { data, error } = await tables(supabase)
      .update({ name, capacity, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("booking_id", ctx.booking.id)
      .select("id");
    if (error) return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  } else {
    const { error } = await tables(supabase).insert({ name, capacity, organization_id: ctx.organization.id, booking_id: ctx.booking.id, created_by: ctx.userId } as never);
    if (error) {
      if (error.code === "23514" && error.message?.includes("40")) return { ok: false, error: "limit" };
      return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    }
  }
  refresh();
  return { ok: true };
}

/** Deletes a table; the guests at it simply have no table again. */
export async function deleteSeatingTable(tableId: string): Promise<SeatingResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(tableId).success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await tables(supabase).delete().eq("id", tableId).eq("booking_id", ctx.booking.id).select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}

/** Puts a guest at a table, moves them, or (tableId null) takes them off their table. A guest has at most one table. */
export async function assignGuestToTable(guestId: string, tableId: string | null): Promise<SeatingResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!uuid.safeParse(guestId).success || (tableId !== null && !uuid.safeParse(tableId).success)) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const assignments = () => supabase.from("seating_assignments" as never);

  if (tableId === null) {
    const { error } = await assignments().delete().eq("guest_id", guestId).eq("booking_id", ctx.booking.id);
    if (error) return { ok: false, error: "failed" };
  } else {
    // Not an upsert: ON CONFLICT DO UPDATE would also write the booking, which the column grants forbid.
    const { data, error } = await assignments().update({ table_id: tableId } as never).eq("guest_id", guestId).eq("booking_id", ctx.booking.id).select("guest_id");
    if (error) return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) {
      const { error: insertError } = await assignments().insert({ guest_id: guestId, table_id: tableId, booking_id: ctx.booking.id } as never);
      if (insertError) return { ok: false, error: insertError.code === "23514" || insertError.code === "23503" ? "invalid" : "failed" };
    }
  }
  refresh();
  return { ok: true };
}

/** Whether guests can see their table on their invitation page. */
export async function saveSeatingSettings(input: SeatingSettings): Promise<SeatingResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = seatingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const settings = () => supabase.from("seating_settings" as never);
  const first = await settings().update({ shared: parsed.data.shared, updated_at: new Date().toISOString() } as never).eq("booking_id", ctx.booking.id).select("booking_id");
  let error = first.error;
  if (!error && ((first.data as unknown[] | null)?.length ?? 0) === 0) {
    ({ error } = await settings().insert({ booking_id: ctx.booking.id, organization_id: ctx.organization.id, shared: parsed.data.shared } as never));
    if (error?.code === "23505") ({ error } = await settings().update({ shared: parsed.data.shared } as never).eq("booking_id", ctx.booking.id));
  }
  if (error) return { ok: false, error: "failed" };
  refresh();
  return { ok: true };
}
