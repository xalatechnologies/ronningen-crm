"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getDefaultT } from "@/lib/i18n/default-messages";
import { buildBookingPortalActionUrl } from "@/lib/notifications/notification-events";
import { notifyOrgMembers } from "@/lib/notifications/notify";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { emailCustomerThrottled } from "./notify-customer";
import { requireStaffForBooking } from "./staff";
import {
  counterInputSchema,
  quoteInputSchema,
  wishItemInputSchema,
  type WishItemInput,
  type WishStatus,
} from "./wishlist-rules";

export type WishResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "not_found" | "wrong_state" | "limit" | "expired" | "failed" };

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const items = (c: Admin | Awaited<ReturnType<typeof createServerSupabaseClient>>) => c.from("portal_wish_items" as never);

type ItemRow = {
  id: string;
  organization_id: string;
  booking_id: string;
  title: string;
  quantity: number | string;
  status: WishStatus;
  revision: number;
  quote_seq: number;
};

async function loadItem(admin: Admin, itemId: string, bookingId: string): Promise<ItemRow | null> {
  const { data } = await items(admin)
    .select("id, organization_id, booking_id, title, quantity, status, revision, quote_seq")
    .eq("id", itemId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return (data as unknown as ItemRow | null) ?? null;
}

type DbResult = "ok" | "not_found" | "wrong_state" | "expired" | "limit" | "invalid";

/**
 * One atomic state change in the database (portal_wish_act locks the item and applies every write of the
 * transition together, or none). The caller has already authorised the actor.
 */
async function act(
  admin: Admin,
  p: { org: string; bookingId: string; itemId: string; actor: "customer" | "staff"; action: string; userId: string; args?: Record<string, unknown> },
): Promise<WishResult> {
  const { data, error } = await admin.rpc("portal_wish_act" as never, {
    p_org: p.org,
    p_booking_id: p.bookingId,
    p_item_id: p.itemId,
    p_actor: p.actor,
    p_action: p.action,
    p_user: p.userId,
    p_args: p.args ?? {},
  } as never);
  if (error) return { ok: false, error: "failed" };
  const result = data as unknown as DbResult;
  return result === "ok" ? { ok: true } : { ok: false, error: result };
}

// ---------------------------------------------------------------- customer

async function notifyStaff(
  ctx: NonNullable<Awaited<ReturnType<typeof getPortalContext>>>,
  kind: "wishSent" | "wishApproved" | "wishDeclined" | "wishCountered" | "wishRevised" | "wishWithdrawn",
  vars: { item?: string; count?: number },
) {
  try {
    const admin = createSupabaseAdminClient();
    const { data: booking } = await admin.from("bookings").select("booking_reference").eq("id", ctx.booking.id).maybeSingle();
    const t = getDefaultT();
    await notifyOrgMembers({
      organizationId: ctx.organization.id,
      roles: ["owner", "admin"],
      eventKey: "portal.wish",
      contextKey: `portal_wish:${ctx.booking.id}:${randomUUID()}`,
      title: t("portal.notify.wishTitle"),
      body: t(`portal.notify.${kind}`, {
        customer: ctx.fullName,
        item: vars.item ?? "",
        count: vars.count ?? 0,
        label: booking?.booking_reference?.trim() || ctx.booking.id.slice(0, 8),
      }),
      actionUrl: buildBookingPortalActionUrl(ctx.booking.id, "wishes"),
      actionLabel: t("portal.notify.wishAction"),
    });
  } catch (error) {
    console.error("[portal] staff notify (wishlist) failed", error);
  }
}

const refreshCustomer = () => revalidatePath("/portal", "layout");

/** Creates or edits a DRAFT wish. RLS (draft-only policies) enforces it again at the database. */
export async function saveWishItem(input: WishItemInput): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = wishItemInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...fields } = parsed.data;

  const supabase = await createServerSupabaseClient();
  if (id) {
    const { data, error } = await items(supabase)
      .update({ ...fields, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("booking_id", ctx.booking.id)
      .eq("status", "draft")
      .select("id");
    if (error) return { ok: false, error: "failed" };
    if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "wrong_state" };
  } else {
    const { error } = await items(supabase).insert({
      ...fields,
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      created_by: ctx.userId,
      status: "draft",
    } as never);
    if (error) return { ok: false, error: "failed" };
  }
  refreshCustomer();
  return { ok: true };
}

export async function deleteWishItem(itemId: string): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await items(supabase)
    .delete()
    .eq("id", itemId)
    .eq("booking_id", ctx.booking.id)
    .eq("status", "draft")
    .select("id");
  if (error) return { ok: false, error: "failed" };
  if (((data as unknown[] | null)?.length ?? 0) === 0) return { ok: false, error: "wrong_state" };
  refreshCustomer();
  return { ok: true };
}

/** Sends every draft to the venue in one go. */
export async function sendWishes(): Promise<WishResult & { count?: number }> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await items(admin)
    .update({ status: "requested", requested_at: now, updated_at: now } as never)
    .eq("booking_id", ctx.booking.id)
    .eq("status", "draft")
    .select("id");
  if (error) return { ok: false, error: "failed" };
  const count = (data as unknown[] | null)?.length ?? 0;
  if (count === 0) return { ok: false, error: "invalid" };
  await notifyStaff(ctx, "wishSent", { count });
  refreshCustomer();
  return { ok: true, count };
}

/** The customer answers the quote THEY SAW (quoteId): if the venue changed it meanwhile, nothing is approved. */
export async function respondToQuote(input: { itemId: string; quoteId: string; answer: "approve" | "decline" }): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const item = await loadItem(admin, input.itemId, ctx.booking.id);
  if (!item) return { ok: false, error: "not_found" };
  const result = await act(admin, { org: ctx.organization.id, bookingId: ctx.booking.id, itemId: item.id, actor: "customer", action: input.answer, userId: ctx.userId, args: { quote_id: input.quoteId } });
  if (!result.ok) return result;
  await notifyStaff(ctx, input.answer === "approve" ? "wishApproved" : "wishDeclined", { item: item.title });
  refreshCustomer();
  return { ok: true };
}

export async function counterQuote(input: { itemId: string; quoteId: string; unitPriceNok: number; note?: string | null }): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = counterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const admin = createSupabaseAdminClient();
  const item = await loadItem(admin, parsed.data.itemId, ctx.booking.id);
  if (!item) return { ok: false, error: "not_found" };
  const result = await act(admin, {
    org: ctx.organization.id, bookingId: ctx.booking.id, itemId: item.id, actor: "customer", action: "counter", userId: ctx.userId,
    args: { quote_id: parsed.data.quoteId, unit_price: parsed.data.unitPriceNok, note: parsed.data.note },
  });
  if (!result.ok) return result;
  await notifyStaff(ctx, "wishCountered", { item: item.title });
  refreshCustomer();
  return { ok: true };
}

export async function withdrawWish(itemId: string): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const item = await loadItem(admin, itemId, ctx.booking.id);
  if (!item) return { ok: false, error: "not_found" };
  const result = await act(admin, { org: ctx.organization.id, bookingId: ctx.booking.id, itemId: item.id, actor: "customer", action: "withdraw", userId: ctx.userId });
  if (!result.ok) return result;
  await notifyStaff(ctx, "wishWithdrawn", { item: item.title });
  refreshCustomer();
  return { ok: true };
}

/** Edit a wish the venue already has: back to "requested", any quote or counter is voided, revision + 1. */
export async function reviseWish(input: WishItemInput & { id: string }): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = wishItemInputSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { ok: false, error: "invalid" };
  const { id, ...fields } = parsed.data;
  const admin = createSupabaseAdminClient();
  const result = await act(admin, { org: ctx.organization.id, bookingId: ctx.booking.id, itemId: id, actor: "customer", action: "revise", userId: ctx.userId, args: fields });
  if (!result.ok) return result;
  await notifyStaff(ctx, "wishRevised", { item: fields.title });
  refreshCustomer();
  return { ok: true };
}

/** Declined, withdrawn or unavailable wishes can be reopened as a draft to edit and send again. */
export async function reopenWish(itemId: string): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const result = await act(admin, { org: ctx.organization.id, bookingId: ctx.booking.id, itemId, actor: "customer", action: "reopen", userId: ctx.userId });
  if (!result.ok) return result;
  refreshCustomer();
  return { ok: true };
}

// ------------------------------------------------------------------- staff

async function staffContext(bookingId: string, itemId: string) {
  const staff = await requireStaffForBooking(bookingId);
  if (!staff.ok) return { ok: false as const, error: "forbidden" as const };
  const admin = createSupabaseAdminClient();
  const item = await loadItem(admin, itemId, bookingId);
  if (!item || item.organization_id !== staff.organizationId) return { ok: false as const, error: "not_found" as const };
  return { ok: true as const, staff, admin, item };
}

async function afterStaffChange(organizationId: string, bookingId: string) {
  try {
    await emailCustomerThrottled({ organizationId, bookingId, kind: "wishlist" });
  } catch (error) {
    console.error("[portal] customer e-mail (wishlist) failed", error);
  }
  revalidatePath(`/app/bookings/${bookingId}/portal`);
}

/** Venue sets (or replaces) the price of a wish. */
export async function quoteWish(input: {
  bookingId: string;
  itemId: string;
  unitPriceNok: number;
  vatIncluded: boolean;
  note?: string | null;
  validUntil?: string | null;
}): Promise<WishResult> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const c = await staffContext(parsed.data.bookingId, parsed.data.itemId);
  if (!c.ok) return c;
  const { admin, item, staff } = c;
  const result = await act(admin, {
    org: staff.organizationId, bookingId: item.booking_id, itemId: item.id, actor: "staff", action: "quote", userId: staff.userId,
    args: { unit_price: parsed.data.unitPriceNok, vat_included: parsed.data.vatIncluded, note: parsed.data.note, valid_until: parsed.data.validUntil ?? null },
  });
  if (!result.ok) return result;
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}

async function staffAct(input: { bookingId: string; itemId: string }, action: "unavailable" | "accept_counter" | "reject_counter"): Promise<WishResult> {
  const c = await staffContext(input.bookingId, input.itemId);
  if (!c.ok) return c;
  const { admin, item, staff } = c;
  const result = await act(admin, { org: staff.organizationId, bookingId: item.booking_id, itemId: item.id, actor: "staff", action, userId: staff.userId });
  if (!result.ok) return result;
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}

export async function markWishUnavailable(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  return staffAct(input, "unavailable");
}

/** Venue accepts the customer's price: a new active quote at that price, item approved. */
export async function acceptCounter(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  return staffAct(input, "accept_counter");
}

/** Venue keeps its price: the counter is rejected and the original quote is open for the customer again. */
export async function rejectCounter(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  return staffAct(input, "reject_counter");
}
