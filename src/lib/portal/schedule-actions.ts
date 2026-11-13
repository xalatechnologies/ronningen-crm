"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getDefaultT } from "@/lib/i18n/default-messages";
import { buildBookingPortalActionUrl } from "@/lib/notifications/notification-events";
import { notifyOrgMembers } from "@/lib/notifications/notify";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { emailCustomerThrottled } from "./notify-customer";
import { scheduleContentHash } from "./schedule-hash";
import {
  MAX_SCHEDULE_ITEMS,
  scheduleItemInputSchema,
  sortEntries,
  type ScheduleEntry,
  type ScheduleItemInput,
} from "./schedule-rules";
import { requireStaffForBooking } from "./staff";

export type ScheduleResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "forbidden" | "not_found" | "unchanged" | "limit" | "failed" };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type Admin = ReturnType<typeof createSupabaseAdminClient>;
const items = (c: Client | Admin) => c.from("portal_schedule_items" as never);
const versions = (c: Admin) => c.from("portal_schedule_versions" as never);

const refreshCustomer = () => revalidatePath("/portal", "layout");

/** Creates or edits one plan item. The booking comes from the session; RLS enforces it again. */
export async function saveScheduleItem(input: ScheduleItemInput): Promise<ScheduleResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = scheduleItemInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, startTime, durationMin, title, note, responsible } = parsed.data;
  const fields = { start_time: startTime, duration_min: durationMin, title, note, responsible };

  const supabase = await createServerSupabaseClient();
  if (id) {
    const { data, error } = await items(supabase)
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("booking_id", ctx.booking.id)
      .select("id");
    if (error) return { ok: false, error: "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  } else {
    const { count } = await items(supabase).select("id", { count: "exact", head: true }).eq("booking_id", ctx.booking.id);
    if ((count ?? 0) >= MAX_SCHEDULE_ITEMS) return { ok: false, error: "limit" };
    const { error } = await items(supabase).insert({
      ...fields,
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      created_by: ctx.userId,
    } as never);
    if (error) return { ok: false, error: "failed" };
  }
  refreshCustomer();
  return { ok: true };
}

export async function deleteScheduleItem(itemId: string): Promise<ScheduleResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  if (!z.string().uuid().safeParse(itemId).success) return { ok: false, error: "invalid" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await items(supabase).delete().eq("id", itemId).eq("booking_id", ctx.booking.id).select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  refreshCustomer();
  return { ok: true };
}

/**
 * Shares the plan: an immutable snapshot built here from the stored items, never from client data.
 * Refuses when nothing changed since the latest shared version.
 */
export async function shareSchedule(): Promise<ScheduleResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();

  const { data: rows } = await items(admin)
    .select("id, start_time, duration_min, title, note, responsible")
    .eq("booking_id", ctx.booking.id);
  const entries: ScheduleEntry[] = sortEntries(
    ((rows as unknown as { id: string; start_time: string; duration_min: number | null; title: string; note: string | null; responsible: string | null }[] | null) ?? []).map(
      (r) => ({ id: r.id, startTime: r.start_time.slice(0, 5), durationMin: r.duration_min, title: r.title, note: r.note, responsible: r.responsible }),
    ),
  );
  if (entries.length === 0) return { ok: false, error: "invalid" };

  const hash = scheduleContentHash(entries);
  const { data: latest } = await versions(admin)
    .select("version, content_hash")
    .eq("booking_id", ctx.booking.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = latest as { version: number; content_hash: string } | null;
  if (last?.content_hash === hash) return { ok: false, error: "unchanged" };

  const version = (last?.version ?? 0) + 1;
  const { error } = await versions(admin).insert({
    organization_id: ctx.organization.id,
    booking_id: ctx.booking.id,
    version,
    // The snapshot carries content only (no ids): that is all the venue needs.
    items: entries.map(({ startTime, durationMin, title, note, responsible }) => ({ startTime, durationMin, title, note, responsible })),
    content_hash: hash,
    shared_by: ctx.userId,
  } as never);
  if (error) return { ok: false, error: "failed" }; // includes a lost race on the unique (booking, version)

  try {
    const { data: booking } = await admin.from("bookings").select("booking_reference").eq("id", ctx.booking.id).maybeSingle();
    const t = getDefaultT();
    await notifyOrgMembers({
      organizationId: ctx.organization.id,
      roles: ["owner", "admin"],
      eventKey: "portal.schedule",
      contextKey: `portal_schedule:${ctx.booking.id}:${randomUUID()}`,
      title: t("portal.notify.scheduleTitle"),
      body: t("portal.notify.scheduleBody", {
        customer: ctx.fullName,
        version,
        count: entries.length,
        label: booking?.booking_reference?.trim() || ctx.booking.id.slice(0, 8),
      }),
      actionUrl: buildBookingPortalActionUrl(ctx.booking.id, "schedule"),
      actionLabel: t("portal.notify.scheduleAction"),
    });
  } catch (notifyError) {
    console.error("[portal] staff notify (schedule) failed", notifyError);
  }
  refreshCustomer();
  return { ok: true };
}

/** Venue confirms it has seen a shared version, with an optional note. Never edits the plan itself. */
export async function acknowledgeSchedule(input: { bookingId: string; versionId: string; note?: string }): Promise<ScheduleResult> {
  const parsed = z
    .object({ bookingId: z.string().uuid(), versionId: z.string().uuid(), note: z.string().trim().max(1000).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const staff = await requireStaffForBooking(parsed.data.bookingId);
  if (!staff.ok) return { ok: false, error: "forbidden" };

  const admin = createSupabaseAdminClient();
  const { data: version } = await versions(admin)
    .select("id, organization_id, acknowledged_at")
    .eq("id", parsed.data.versionId)
    .eq("booking_id", parsed.data.bookingId)
    .maybeSingle();
  const v = version as { id: string; organization_id: string; acknowledged_at: string | null } | null;
  if (!v || v.organization_id !== staff.organizationId) return { ok: false, error: "not_found" };
  if (v.acknowledged_at) return { ok: true }; // idempotent

  const { error } = await versions(admin)
    .update({
      acknowledged_by: staff.userId,
      acknowledged_at: new Date().toISOString(),
      staff_note: parsed.data.note ? parsed.data.note : null,
    } as never)
    .eq("id", v.id)
    .is("acknowledged_at", null);
  if (error) return { ok: false, error: "failed" };

  try {
    await emailCustomerThrottled({ organizationId: staff.organizationId, bookingId: parsed.data.bookingId, kind: "schedule" });
  } catch (mailError) {
    console.error("[portal] customer e-mail (schedule) failed", mailError);
  }
  revalidatePath(`/app/bookings/${parsed.data.bookingId}/portal`);
  return { ok: true };
}

/** Shows or hides the day plan (time and title) on the guests' invitation page. Needs an invitation to attach to. */
export async function setScheduleVisibleToGuests(visible: boolean): Promise<ScheduleResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("portal_invite_designs" as never)
    .update({ show_schedule: Boolean(visible), updated_by: ctx.userId } as never)
    .eq("booking_id", ctx.booking.id)
    .select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "not_found" };
  revalidatePath("/portal", "layout");
  return { ok: true };
}
