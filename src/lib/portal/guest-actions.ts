"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resetGuestInvitation } from "./guest-tokens";
import { getPortalContext } from "./context";
import { guestInputSchema, MAX_GUESTS, parseGuestPaste, type GuestInput, type PasteError } from "./guest-rules";

export type GuestError = "invalid" | "forbidden" | "duplicate" | "limit" | "not_found" | "failed";
export type GuestResult = { ok: true } | { ok: false; error: GuestError };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
const guests = (c: Client) => c.from("portal_guests" as never);
const refresh = () => revalidatePath("/portal", "layout");

/** Maps a Postgres error code to our result: 23505 unique e-mail, 23514 cap or check constraint. */
function mapError(error: { code?: string; message?: string }): GuestResult {
  if (error.code === "23505") return { ok: false, error: "duplicate" };
  if (error.code === "23514" && error.message?.includes("300")) return { ok: false, error: "limit" };
  if (error.code === "23514") return { ok: false, error: "invalid" };
  return { ok: false, error: "failed" };
}

/** Creates or edits one guest. The booking comes from the session; RLS and column grants enforce it again. */
export async function saveGuest(input: GuestInput): Promise<GuestResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = guestInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, name, email, phone, groupLabel, maxParty } = parsed.data;

  const supabase = await createServerSupabaseClient();
  if (id) {
    const { data: before } = await guests(supabase).select("email, status").eq("id", id).eq("booking_id", ctx.booking.id).maybeSingle();
    const prev = before as unknown as { email: string | null; status: string } | null;
    const { data, error } = await guests(supabase)
      .update({ name, email, phone, group_label: groupLabel, max_party: maxParty, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("booking_id", ctx.booking.id)
      .select("id");
    if (error) return mapError(error);
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
    // A changed address must not keep the old address's links or answer.
    if (prev && prev.status !== "not_sent" && (prev.email ?? null) !== (email ?? null)) {
      await resetGuestInvitation(createSupabaseAdminClient(), id);
    }
  } else {
    const { error } = await guests(supabase).insert({
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      name,
      email,
      phone,
      group_label: groupLabel,
      max_party: maxParty,
      created_by: ctx.userId,
    } as never);
    if (error) return mapError(error);
  }
  refresh();
  return { ok: true };
}

export async function deleteGuest(guestId: string): Promise<GuestResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!z.string().uuid().safeParse(guestId).success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await guests(supabase).delete().eq("id", guestId).eq("booking_id", ctx.booking.id).select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}

/** Removes the whole list (the customer's right to delete; guest data is kept only until they do). */
export async function deleteAllGuests(): Promise<GuestResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const supabase = await createServerSupabaseClient();
  const { error } = await guests(supabase).delete().eq("booking_id", ctx.booking.id);
  if (error) return { ok: false, error: "failed" };
  refresh();
  return { ok: true };
}

/** Parses pasted text on the server (never trusts a client-parsed list) and inserts what is valid. */
export async function importGuests(text: string): Promise<{ ok: true; added: number; errors: PasteError[] } | { ok: false; error: GuestError }> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (typeof text !== "string" || text.length > 60_000) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabaseClient();
  const { data } = await guests(supabase).select("email").eq("booking_id", ctx.booking.id);
  const existing = (data as unknown as { email: string | null }[] | null) ?? [];
  const emails = new Set(existing.map((r) => r.email).filter((e): e is string => Boolean(e)));

  const { rows, errors } = parseGuestPaste(text, emails, MAX_GUESTS - existing.length);
  if (rows.length === 0) return { ok: true, added: 0, errors };

  const { error } = await guests(supabase).insert(
    rows.map((r) => ({
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      name: r.name,
      email: r.email,
      group_label: r.groupLabel,
      created_by: ctx.userId,
    })) as never,
  );
  if (error) {
    const mapped = mapError(error);
    return { ok: false, error: mapped.ok ? "failed" : mapped.error };
  }
  refresh();
  return { ok: true, added: rows.length, errors };
}
