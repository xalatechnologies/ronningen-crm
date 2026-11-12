import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Database } from "@/types/database.types";
import type { PortalMessage } from "./messages-rules";

type Client = SupabaseClient<Database>;

type Row = {
  id: string;
  sender_kind: "customer" | "staff";
  sender_user_id: string | null;
  body: string;
  created_at: string;
  read_by_customer_at: string | null;
  read_by_staff_at: string | null;
};

const messages = (client: Client) => client.from("portal_messages" as never);

/** The latest 200 messages of a booking's thread, oldest first. `client` is the caller's RLS-scoped client. */
export async function listThread(
  client: Client,
  bookingId: string,
  names: { customerName: string; venueName: string },
): Promise<PortalMessage[]> {
  const { data } = await messages(client)
    .select("id, sender_kind, sender_user_id, body, created_at, read_by_customer_at, read_by_staff_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = ((data as unknown as Row[] | null) ?? []).reverse();

  // Staff names: profiles of the senders in this thread only (service role, ids come from RLS-visible rows).
  const staffIds = [...new Set(rows.filter((r) => r.sender_kind === "staff" && r.sender_user_id).map((r) => r.sender_user_id!))];
  const staffNames = new Map<string, string>();
  if (staffIds.length > 0) {
    const { data: profiles } = await createSupabaseAdminClient()
      .from("profiles")
      .select("id, full_name")
      .in("id", staffIds);
    for (const p of profiles ?? []) {
      if (p.full_name?.trim()) staffNames.set(p.id, p.full_name.trim());
    }
  }

  return rows.map((r) => ({
    id: r.id,
    senderKind: r.sender_kind,
    senderName:
      r.sender_kind === "customer"
        ? names.customerName
        : ((r.sender_user_id && staffNames.get(r.sender_user_id)) || names.venueName),
    body: r.body,
    createdAt: r.created_at,
    readByCustomerAt: r.read_by_customer_at,
    readByStaffAt: r.read_by_staff_at,
  }));
}

export async function countUnread(
  client: Client,
  bookingId: string,
  audience: "customer" | "staff",
): Promise<number> {
  const { count } = await messages(client)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId)
    .eq("sender_kind", audience === "customer" ? "staff" : "customer")
    .is(audience === "customer" ? "read_by_customer_at" : "read_by_staff_at", null);
  return count ?? 0;
}
