"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getDefaultT } from "@/lib/i18n/default-messages";
import { buildBookingPortalActionUrl } from "@/lib/notifications/notification-events";
import { notifyOrgMembers } from "@/lib/notifications/notify";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { emailCustomerThrottled } from "./notify-customer";
import {
  isRateLimited,
  normalizeMessageBody,
  staffNotificationContextKey,
} from "./messages-rules";
import { requireStaffForBooking } from "./staff";

export type SendMessageResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate_limited" | "forbidden" | "failed" };

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const messages = (client: Client | ReturnType<typeof createSupabaseAdminClient>) =>
  client.from("portal_messages" as never);

/** Messages this user sent in the last minute (DB-backed: an in-memory limiter does not hold on serverless). */
async function sentInLastMinute(client: Client, bookingId: string, userId: string): Promise<number> {
  const { count } = await messages(client)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("sender_user_id", userId)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  return count ?? 0;
}

/** Customer writes to the venue. The booking comes from the session, never from the client. */
export async function sendCustomerMessage(input: { body: string }): Promise<SendMessageResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const body = normalizeMessageBody(input.body);
  if (!body) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabaseClient();
  if (isRateLimited(await sentInLastMinute(supabase, ctx.booking.id, ctx.userId))) {
    return { ok: false, error: "rate_limited" };
  }

  // RLS enforces sender_kind, sender_user_id and that the booking is the customer's own.
  const { error } = await messages(supabase).insert({
    organization_id: ctx.organization.id,
    booking_id: ctx.booking.id,
    sender_kind: "customer",
    sender_user_id: ctx.userId,
    body,
  } as never);
  if (error) return { ok: false, error: "failed" };

  try {
    await notifyStaffOfCustomerMessage({
      organizationId: ctx.organization.id,
      bookingId: ctx.booking.id,
      customerName: ctx.fullName,
    });
  } catch (notifyError) {
    console.error("[portal] staff notify after customer message failed", notifyError);
  }

  revalidatePath("/portal/messages");
  return { ok: true };
}

async function notifyStaffOfCustomerMessage(input: {
  organizationId: string;
  bookingId: string;
  customerName: string;
}) {
  const admin = createSupabaseAdminClient();
  const [{ data: oldest }, { data: booking }] = await Promise.all([
    messages(admin)
      .select("id")
      .eq("booking_id", input.bookingId)
      .eq("sender_kind", "customer")
      .is("read_by_staff_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin.from("bookings").select("booking_reference").eq("id", input.bookingId).maybeSingle(),
  ]);
  const oldestId = (oldest as { id: string } | null)?.id;
  if (!oldestId) return;

  const t = getDefaultT();
  await notifyOrgMembers({
    organizationId: input.organizationId,
    roles: ["owner", "admin"],
    eventKey: "portal.message",
    contextKey: staffNotificationContextKey(input.bookingId, oldestId),
    title: t("portal.notify.messageTitle"),
    body: t("portal.notify.messageBody", {
      customer: input.customerName,
      label: booking?.booking_reference?.trim() || input.bookingId.slice(0, 8),
    }),
    actionUrl: buildBookingPortalActionUrl(input.bookingId),
    actionLabel: t("portal.notify.messageAction"),
  });
}

/** Venue staff writes to the customer. Needs a booking-capable role in the booking's organization. */
export async function sendStaffMessage(input: { bookingId: string; body: string }): Promise<SendMessageResult> {
  const staff = await requireStaffForBooking(input.bookingId);
  if (!staff.ok) return { ok: false, error: "forbidden" };
  const body = normalizeMessageBody(input.body);
  if (!body) return { ok: false, error: "invalid" };

  if (isRateLimited(await sentInLastMinute(staff.supabase, input.bookingId, staff.userId))) {
    return { ok: false, error: "rate_limited" };
  }

  const { error } = await messages(staff.supabase).insert({
    organization_id: staff.organizationId,
    booking_id: input.bookingId,
    sender_kind: "staff",
    sender_user_id: staff.userId,
    body,
  } as never);
  if (error) return { ok: false, error: "failed" };

  try {
    await emailCustomerThrottled({ organizationId: staff.organizationId, bookingId: input.bookingId, kind: "message" });
  } catch (mailError) {
    console.error("[portal] customer e-mail after staff message failed", mailError);
  }

  revalidatePath(`/app/bookings/${input.bookingId}/portal`);
  return { ok: true };
}

/** Customer opened the thread: mark the venue's messages as read. */
export async function markThreadReadByCustomer(): Promise<void> {
  const ctx = await getPortalContext();
  if (!ctx) return;
  await messages(createSupabaseAdminClient())
    .update({ read_by_customer_at: new Date().toISOString() } as never)
    .eq("booking_id", ctx.booking.id)
    .eq("sender_kind", "staff")
    .is("read_by_customer_at", null);
  revalidatePath("/portal", "layout");
}

/** Staff opened the thread: mark the customer's messages as read. */
export async function markThreadReadByStaff(bookingId: string): Promise<void> {
  const staff = await requireStaffForBooking(bookingId);
  if (!staff.ok) return;
  await messages(createSupabaseAdminClient())
    .update({ read_by_staff_at: new Date().toISOString() } as never)
    .eq("booking_id", bookingId)
    .eq("sender_kind", "customer")
    .is("read_by_staff_at", null);
  revalidatePath(`/app/bookings/${bookingId}/portal`);
}
