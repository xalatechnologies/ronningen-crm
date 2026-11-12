import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Database } from "@/types/database.types";
import { DIET_TAGS, parseSummary, type DietTag, type GuestRow, type GuestStatus, type GuestSummary } from "./guest-rules";

type Client = SupabaseClient<Database>;

type Row = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  group_label: string | null;
  max_party: number;
  status: GuestStatus;
  party_size: number;
  diet: unknown;
  responded_at: string | null;
  last_sent_at: string | null;
  opted_out: boolean;
};

function readDiet(raw: unknown): GuestRow["diet"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => {
    const o = (p ?? {}) as { label?: unknown; tags?: unknown; note?: unknown };
    const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is DietTag => DIET_TAGS.includes(t as DietTag)) : [];
    return { label: typeof o.label === "string" ? o.label : "", tags, note: typeof o.note === "string" ? o.note : "" };
  });
}

/** The booking's guest list for the customer. `client` is RLS-scoped; token_hash is never selected. */
export async function listGuests(client: Client, bookingId: string): Promise<GuestRow[]> {
  const { data } = await client
    .from("portal_guests" as never)
    .select("id, name, email, phone, group_label, max_party, status, party_size, diet, responded_at, last_sent_at, opted_out")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    groupLabel: r.group_label,
    maxParty: r.max_party,
    status: r.status,
    partySize: r.party_size,
    diet: readDiet(r.diet),
    respondedAt: r.responded_at,
    lastSentAt: r.last_sent_at,
    optedOut: r.opted_out,
  }));
}

/** Numbers-only summary for the venue (database function: members of the booking's organization only). */
export async function getGuestSummary(client: Client, bookingId: string): Promise<GuestSummary | null> {
  const { data, error } = await client.rpc("portal_guest_summary" as never, { p_booking_id: bookingId } as never);
  if (error) return null;
  return parseSummary(data);
}

export async function countGuests(client: Client, bookingId: string): Promise<number> {
  const { count } = await client
    .from("portal_guests" as never)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  return count ?? 0;
}

/** The venue's switch for customers e-mailing guests (service role: customers cannot read organizations). */
export async function guestInvitesEnabled(organizationId: string): Promise<boolean> {
  const { data } = await createSupabaseAdminClient()
    .from("organizations")
    .select("portal_guest_invites_enabled" as "id")
    .eq("id", organizationId)
    .maybeSingle();
  return Boolean((data as unknown as { portal_guest_invites_enabled?: boolean } | null)?.portal_guest_invites_enabled);
}
