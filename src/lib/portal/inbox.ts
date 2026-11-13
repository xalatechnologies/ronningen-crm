import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { inboxAttention, inboxTab, sortInbox, type InboxRow } from "./inbox-rules";
import { portalInviteState } from "./rules";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;
type Rows<T> = { data: T[] | null };

/**
 * Every customer portal of the venue with what is waiting for a reply. `client` is the signed-in staff
 * member's RLS-scoped client (managers and above see rows; anyone else gets none).
 * shortcut: newest 200 portals and 1000 waiting rows, enough until a venue runs that many live portals.
 */
export async function listPortalInbox(client: Client, organizationId: string): Promise<InboxRow[]> {
  const from = (table: string) => client.from(table as never);
  const { data: accountRows } = (await from("portal_accounts")
    .select("booking_id, email, expires_at, accepted_at, revoked_at")
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(200)) as unknown as Rows<{ booking_id: string; email: string; expires_at: string; accepted_at: string | null; revoked_at: string | null }>;
  const accounts = accountRows ?? [];
  if (accounts.length === 0) return [];
  const ids = accounts.map((a) => a.booking_id);

  const [{ data: bookings }, { data: messages }, { data: wishes }, { data: versions }] = await Promise.all([
    client.from("bookings").select("id, booking_reference, event_date, event_type, fest_type, customer_id").in("id", ids),
    from("portal_messages").select("booking_id").in("booking_id", ids).eq("sender_kind", "customer").is("read_by_staff_at", null).limit(1000) as unknown as Promise<Rows<{ booking_id: string }>>,
    from("portal_wish_items").select("booking_id").in("booking_id", ids).in("status", ["requested", "countered"]).limit(1000) as unknown as Promise<Rows<{ booking_id: string }>>,
    from("portal_schedule_versions").select("booking_id, version, acknowledged_at").in("booking_id", ids).order("version", { ascending: false }).limit(1000) as unknown as Promise<
      Rows<{ booking_id: string; version: number; acknowledged_at: string | null }>
    >,
  ]);
  const customerIds = [...new Set((bookings ?? []).map((b) => b.customer_id))];
  const { data: customers } = await client.from("customers").select("id, name").in("id", customerIds);

  const count = (rows: { booking_id: string }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows ?? []) map.set(r.booking_id, (map.get(r.booking_id) ?? 0) + 1);
    return map;
  };
  const unread = count(messages);
  const wishCount = count(wishes);
  const latestPlan = new Map<string, boolean>();
  for (const v of versions ?? []) if (!latestPlan.has(v.booking_id)) latestPlan.set(v.booking_id, !v.acknowledged_at);

  const rows = accounts.flatMap((a): InboxRow[] => {
    const b = (bookings ?? []).find((x) => x.id === a.booking_id);
    if (!b) return [];
    const invite = portalInviteState(a);
    const row = {
      unread: unread.get(b.id) ?? 0,
      wishesWaiting: wishCount.get(b.id) ?? 0,
      planWaiting: latestPlan.get(b.id) ?? false,
    };
    return [
      {
        bookingId: b.id,
        customerName: (customers ?? []).find((c) => c.id === b.customer_id)?.name ?? a.email,
        reference: b.booking_reference ?? "",
        eventDate: b.event_date,
        eventType: b.fest_type || b.event_type,
        state: invite === "accepted" ? "active" : invite === "expired" ? "expired" : "invited",
        ...row,
        attention: inboxAttention(row),
        tab: inboxTab(row),
      },
    ];
  });
  return sortInbox(rows);
}
