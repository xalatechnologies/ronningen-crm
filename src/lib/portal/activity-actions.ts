"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activityInputSchema, osloLocalToIso, type ActivityInput } from "./activity-rules";
import { getPortalContext } from "./context";

export type ActivityResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "not_found" | "failed" };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
const acts = (c: Client) => c.from("portal_activities" as never);
const invitees = (c: Client) => c.from("portal_activity_invitees" as never);
const refresh = () => revalidatePath("/portal", "layout");

/**
 * Creates or edits an activity and its invited guests. The booking comes from the session; RLS, column
 * grants and the database's checks enforce it again. Only guests of this booking can be invited.
 */
export async function saveActivity(input: ActivityInput): Promise<ActivityResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = activityInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;
  const startsAt = osloLocalToIso(v.startsAtLocal)!;
  const endsAt = v.endsAtLocal ? osloLocalToIso(v.endsAtLocal) : null;

  const supabase = await createServerSupabaseClient();
  const fields = {
    title: v.title,
    description: v.description,
    location: v.location,
    starts_at: startsAt,
    ends_at: endsAt,
    audience: v.audience,
    capacity: v.capacity,
  };

  let activityId = v.id;
  if (activityId) {
    const { data, error } = await acts(supabase)
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq("id", activityId)
      .eq("booking_id", ctx.booking.id)
      .select("id");
    if (error) return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  } else {
    const { data, error } = await acts(supabase)
      .insert({ ...fields, organization_id: ctx.organization.id, booking_id: ctx.booking.id, created_by: ctx.userId } as never)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.code === "23514" ? "invalid" : "failed" };
    activityId = (data as unknown as { id: string }).id;
  }

  // Sync who is invited. "all": no explicit invitees (rows only hold answers); "selected": exactly the chosen guests.
  const { data: existing } = await invitees(supabase).select("guest_id, response").eq("activity_id", activityId);
  const rows = (existing as unknown as { guest_id: string; response: string | null }[] | null) ?? [];
  if (v.audience === "all") {
    const stale = rows.filter((r) => r.response === null).map((r) => r.guest_id);
    if (stale.length > 0) await invitees(supabase).delete().eq("activity_id", activityId).in("guest_id", stale);
  } else {
    const { data: mine } = await supabase.from("portal_guests" as never).select("id").eq("booking_id", ctx.booking.id);
    const valid = new Set(((mine as unknown as { id: string }[] | null) ?? []).map((g) => g.id));
    const wanted = new Set(v.guestIds.filter((id) => valid.has(id)));
    const have = new Set(rows.map((r) => r.guest_id));
    const toRemove = [...have].filter((id) => !wanted.has(id));
    const toAdd = [...wanted].filter((id) => !have.has(id));
    if (toRemove.length > 0) await invitees(supabase).delete().eq("activity_id", activityId).in("guest_id", toRemove);
    if (toAdd.length > 0) {
      const { error } = await invitees(supabase).insert(
        toAdd.map((guest_id) => ({ activity_id: activityId, guest_id, organization_id: ctx.organization.id, booking_id: ctx.booking.id })) as never,
      );
      if (error) return { ok: false, error: "failed" };
    }
  }

  refresh();
  return { ok: true };
}

export async function deleteActivity(activityId: string): Promise<ActivityResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!z.string().uuid().safeParse(activityId).success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await acts(supabase).delete().eq("id", activityId).eq("booking_id", ctx.booking.id).select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}
