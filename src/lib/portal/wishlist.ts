import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { WishCategory, WishItemView, WishStatus } from "./wishlist-rules";

type Client = SupabaseClient<Database>;

type ItemRow = {
  id: string;
  category: WishCategory;
  title: string;
  description: string | null;
  quantity: number | string;
  unit: string | null;
  status: WishStatus;
  revision: number;
};
type QuoteRow = {
  id: string;
  wish_item_id: string;
  unit_price_nok: number | string;
  total_nok: number | string;
  vat_included: boolean;
  note: string | null;
  valid_until: string | null;
  source: "staff" | "counter";
  status: string;
};
type CounterRow = {
  id: string;
  wish_item_id: string;
  revision: number;
  proposed_unit_price_nok: number | string;
  note: string | null;
  status: string;
};

/**
 * A booking's wishlist with each item's ACTIVE quote and open counter. `client` is the caller's
 * RLS-scoped client, so a customer only ever gets their own booking and staff only their own org.
 */
export async function listWishItems(client: Client, bookingId: string): Promise<WishItemView[]> {
  const [{ data: items }, { data: quotes }, { data: counters }] = await Promise.all([
    client
      .from("portal_wish_items" as never)
      .select("id, category, title, description, quantity, unit, status, revision")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
    client
      .from("portal_wish_quotes" as never)
      .select("id, wish_item_id, unit_price_nok, total_nok, vat_included, note, valid_until, source, status")
      .eq("booking_id", bookingId)
      .eq("status", "active"),
    client
      .from("portal_wish_counters" as never)
      .select("id, wish_item_id, revision, proposed_unit_price_nok, note, status")
      .eq("booking_id", bookingId),
  ]);

  const quoteByItem = new Map(((quotes as unknown as QuoteRow[] | null) ?? []).map((q) => [q.wish_item_id, q]));
  const counterRows = (counters as unknown as CounterRow[] | null) ?? [];

  return ((items as unknown as ItemRow[] | null) ?? []).map((item) => {
    const q = quoteByItem.get(item.id);
    const mine = counterRows.filter((c) => c.wish_item_id === item.id && c.revision === item.revision);
    const open = mine.find((c) => c.status === "open");
    return {
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      status: item.status,
      revision: item.revision,
      counterRounds: mine.length,
      quote: q
        ? {
            id: q.id,
            unitPriceNok: Number(q.unit_price_nok),
            totalNok: Number(q.total_nok),
            vatIncluded: q.vat_included,
            note: q.note,
            validUntil: q.valid_until,
            source: q.source,
          }
        : null,
      openCounter: open
        ? { id: open.id, proposedUnitPriceNok: Number(open.proposed_unit_price_nok), note: open.note }
        : null,
    };
  });
}

/** Wishes with a price waiting for the customer's answer (nav badge / overview). */
export async function countQuoted(client: Client, bookingId: string): Promise<number> {
  const { count } = await client
    .from("portal_wish_items" as never)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("status", "quoted");
  return count ?? 0;
}

/** What needs the customer's eyes: wishes with a price to answer, and wishes the venue cannot provide. */
export async function countWishAttention(client: Client, bookingId: string): Promise<{ quoted: number; unavailable: number }> {
  const head = (status: string) =>
    client.from("portal_wish_items" as never).select("id", { count: "exact", head: true }).eq("booking_id", bookingId).eq("status", status);
  const [quoted, unavailable] = await Promise.all([head("quoted"), head("unavailable")]);
  return { quoted: quoted.count ?? 0, unavailable: unavailable.count ?? 0 };
}

/** Wishes waiting for the venue: new requests and counter-offers (staff badge). */
export async function countAwaitingVenue(client: Client, bookingId: string): Promise<number> {
  const { count } = await client
    .from("portal_wish_items" as never)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .in("status", ["requested", "countered"]);
  return count ?? 0;
}
