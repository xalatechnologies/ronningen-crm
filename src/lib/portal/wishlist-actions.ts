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
import { todayInOslo } from "./rsvp-rules";
import { requireStaffForBooking } from "./staff";
import {
  canCounter,
  canTransition,
  counterInputSchema,
  quoteExpired,
  quoteInputSchema,
  quoteTotalNok,
  wishItemInputSchema,
  type WishItemInput,
  type WishStatus,
} from "./wishlist-rules";

export type WishResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "not_found" | "wrong_state" | "limit" | "expired" | "failed" };

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const items = (c: Admin | Awaited<ReturnType<typeof createServerSupabaseClient>>) => c.from("portal_wish_items" as never);
const quotes = (c: Admin) => c.from("portal_wish_quotes" as never);
const counters = (c: Admin) => c.from("portal_wish_counters" as never);

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

/** Compare-and-set on the current status (and revision): two racing requests cannot both win. */
async function moveItem(
  admin: Admin,
  item: ItemRow,
  to: WishStatus,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  const { data } = await items(admin)
    .update({ status: to, updated_at: new Date().toISOString(), ...extra } as never)
    .eq("id", item.id)
    .eq("status", item.status)
    .eq("revision", item.revision)
    .eq("quote_seq", item.quote_seq)
    .select("id");
  return ((data as unknown[] | null)?.length ?? 0) > 0;
}

/**
 * Closes the item's active quote and open counter, but only those of revision <= maxRevision: a quote the
 * venue wrote for a NEWER revision at the same moment is never touched (it belongs to the edited wish).
 */
async function closeQuoteAndCounter(admin: Admin, itemId: string, maxRevision: number, counterStatus: "superseded" | "rejected" = "superseded") {
  await quotes(admin).update({ status: "superseded" } as never).eq("wish_item_id", itemId).eq("status", "active").lte("revision", maxRevision);
  await counters(admin)
    .update({ status: counterStatus, answered_at: new Date().toISOString() } as never)
    .eq("wish_item_id", itemId)
    .eq("status", "open")
    .lte("revision", maxRevision);
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
  const to: WishStatus = input.answer === "approve" ? "approved" : "declined";
  if (!canTransition("customer", item.status, to)) return { ok: false, error: "wrong_state" };

  const { data: active } = await quotes(admin).select("id, valid_until").eq("wish_item_id", item.id).eq("status", "active").maybeSingle();
  const quote = active as { id: string; valid_until: string | null } | null;
  if (!quote || quote.id !== input.quoteId) return { ok: false, error: "wrong_state" };
  if (input.answer === "approve" && quoteExpired(quote.valid_until)) return { ok: false, error: "expired" };
  if (!(await moveItem(admin, item, to))) return { ok: false, error: "wrong_state" };

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
  if (!canTransition("customer", item.status, "countered")) return { ok: false, error: "wrong_state" };

  const [{ data: active }, { count }] = await Promise.all([
    quotes(admin).select("id, valid_until").eq("wish_item_id", item.id).eq("status", "active").maybeSingle(),
    counters(admin).select("id", { count: "exact", head: true }).eq("wish_item_id", item.id).eq("revision", item.revision),
  ]);
  const activeQuote = active as { id: string; valid_until: string | null } | null;
  if (!activeQuote || activeQuote.id !== parsed.data.quoteId) return { ok: false, error: "wrong_state" };
  if (quoteExpired(activeQuote.valid_until)) return { ok: false, error: "expired" };
  if (!canCounter({ counterRounds: count ?? 0, hasOpenCounter: false })) return { ok: false, error: "limit" };

  if (!(await moveItem(admin, item, "countered"))) return { ok: false, error: "wrong_state" };
  const { error } = await counters(admin).insert({
    organization_id: ctx.organization.id,
    booking_id: ctx.booking.id,
    wish_item_id: item.id,
    quote_id: activeQuote.id,
    revision: item.revision,
    proposed_unit_price_nok: parsed.data.unitPriceNok,
    note: parsed.data.note,
    created_by: ctx.userId,
  } as never);
  if (error) {
    await items(admin).update({ status: "quoted" } as never).eq("id", item.id).eq("status", "countered");
    return { ok: false, error: "failed" };
  }
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
  if (!canTransition("customer", item.status, "withdrawn")) return { ok: false, error: "wrong_state" };
  if (!(await moveItem(admin, item, "withdrawn"))) return { ok: false, error: "wrong_state" };
  await closeQuoteAndCounter(admin, item.id, item.revision);
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
  const item = await loadItem(admin, id, ctx.booking.id);
  if (!item) return { ok: false, error: "not_found" };
  if (!canTransition("customer", item.status, "requested") || item.status === "draft") {
    return { ok: false, error: "wrong_state" };
  }
  if (!(await moveItem(admin, item, "requested", { ...fields, revision: item.revision + 1 }))) {
    return { ok: false, error: "wrong_state" };
  }
  await closeQuoteAndCounter(admin, item.id, item.revision);
  await notifyStaff(ctx, "wishRevised", { item: fields.title });
  refreshCustomer();
  return { ok: true };
}

/** Declined, withdrawn or unavailable wishes can be reopened as a draft to edit and send again. */
export async function reopenWish(itemId: string): Promise<WishResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const item = await loadItem(admin, itemId, ctx.booking.id);
  if (!item) return { ok: false, error: "not_found" };
  if (!canTransition("customer", item.status, "draft")) return { ok: false, error: "wrong_state" };
  if (!(await moveItem(admin, item, "draft", { revision: item.revision + 1 }))) return { ok: false, error: "wrong_state" };
  await closeQuoteAndCounter(admin, item.id, item.revision);
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
  if (!canTransition("staff", item.status, "quoted")) return { ok: false, error: "wrong_state" };
  if (parsed.data.validUntil && parsed.data.validUntil < todayInOslo()) return { ok: false, error: "invalid" };

  const { data: old } = await quotes(admin).select("id").eq("wish_item_id", item.id).eq("status", "active").maybeSingle();
  // quote_seq + 1: any customer answer to the previous quote now fails its version check.
  if (!(await moveItem(admin, item, "quoted", { quote_seq: item.quote_seq + 1 }))) return { ok: false, error: "wrong_state" };

  await quotes(admin).update({ status: "superseded" } as never).eq("wish_item_id", item.id).eq("status", "active");
  const { error } = await quotes(admin).insert({
    organization_id: staff.organizationId,
    booking_id: item.booking_id,
    wish_item_id: item.id,
    revision: item.revision,
    unit_price_nok: parsed.data.unitPriceNok,
    total_nok: quoteTotalNok(parsed.data.unitPriceNok, Number(item.quantity)),
    vat_included: parsed.data.vatIncluded,
    note: parsed.data.note,
    valid_until: parsed.data.validUntil,
    source: "staff",
    quoted_by: staff.userId,
  } as never);
  if (error) {
    // Put things back: previous quote active again, item in its previous state.
    if (old) await quotes(admin).update({ status: "active" } as never).eq("id", (old as { id: string }).id);
    await items(admin).update({ status: item.status } as never).eq("id", item.id);
    return { ok: false, error: "failed" };
  }
  await counters(admin)
    .update({ status: "superseded", answered_by: staff.userId, answered_at: new Date().toISOString() } as never)
    .eq("wish_item_id", item.id)
    .eq("status", "open");
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}

export async function markWishUnavailable(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  const c = await staffContext(input.bookingId, input.itemId);
  if (!c.ok) return c;
  const { admin, item, staff } = c;
  if (!canTransition("staff", item.status, "unavailable")) return { ok: false, error: "wrong_state" };
  if (!(await moveItem(admin, item, "unavailable"))) return { ok: false, error: "wrong_state" };
  await closeQuoteAndCounter(admin, item.id, item.revision);
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}

/** Venue accepts the customer's price: a new active quote at that price, item approved. */
export async function acceptCounter(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  const c = await staffContext(input.bookingId, input.itemId);
  if (!c.ok) return c;
  const { admin, item, staff } = c;
  if (!canTransition("staff", item.status, "approved")) return { ok: false, error: "wrong_state" };

  const [{ data: counter }, { data: quote }] = await Promise.all([
    counters(admin).select("id, proposed_unit_price_nok").eq("wish_item_id", item.id).eq("status", "open").maybeSingle(),
    quotes(admin).select("id, vat_included").eq("wish_item_id", item.id).eq("status", "active").maybeSingle(),
  ]);
  const cn = counter as { id: string; proposed_unit_price_nok: number | string } | null;
  const q = quote as { id: string; vat_included: boolean } | null;
  if (!cn || !q) return { ok: false, error: "wrong_state" };

  if (!(await moveItem(admin, item, "approved", { quote_seq: item.quote_seq + 1 }))) return { ok: false, error: "wrong_state" };
  await quotes(admin).update({ status: "superseded" } as never).eq("id", q.id);
  const unit = Number(cn.proposed_unit_price_nok);
  const { error } = await quotes(admin).insert({
    organization_id: staff.organizationId,
    booking_id: item.booking_id,
    wish_item_id: item.id,
    revision: item.revision,
    unit_price_nok: unit,
    total_nok: quoteTotalNok(unit, Number(item.quantity)),
    vat_included: q.vat_included,
    source: "counter",
    quoted_by: staff.userId,
  } as never);
  if (error) {
    await quotes(admin).update({ status: "active" } as never).eq("id", q.id);
    await items(admin).update({ status: "countered" } as never).eq("id", item.id);
    return { ok: false, error: "failed" };
  }
  await counters(admin)
    .update({ status: "accepted", answered_by: staff.userId, answered_at: new Date().toISOString() } as never)
    .eq("id", cn.id);
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}

/** Venue keeps its price: the counter is rejected and the original quote is open for the customer again. */
export async function rejectCounter(input: { bookingId: string; itemId: string }): Promise<WishResult> {
  const c = await staffContext(input.bookingId, input.itemId);
  if (!c.ok) return c;
  const { admin, item, staff } = c;
  if (!canTransition("staff", item.status, "quoted")) return { ok: false, error: "wrong_state" };
  if (!(await moveItem(admin, item, "quoted"))) return { ok: false, error: "wrong_state" };
  await counters(admin)
    .update({ status: "rejected", answered_by: staff.userId, answered_at: new Date().toISOString() } as never)
    .eq("wish_item_id", item.id)
    .eq("status", "open");
  await afterStaffChange(staff.organizationId, item.booking_id);
  return { ok: true };
}
