import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export type GuestMessageRow = { id: string; subject: string; createdAt: string; recipientCount: number };
export type MessageActivity = { id: string; title: string; guestIds: string[] };

/** The customer's earlier messages, newest first. `client` is RLS-scoped to the customer's own booking. */
export async function listGuestMessages(client: Client, bookingId: string): Promise<GuestMessageRow[]> {
  const { data } = await client
    .from("portal_guest_messages" as never)
    .select("id, subject, created_at, recipient_count")
    .eq("booking_id", bookingId)
    .gt("recipient_count", 0)
    .order("created_at", { ascending: false })
    .limit(10);
  return ((data as unknown as { id: string; subject: string; created_at: string; recipient_count: number }[] | null) ?? []).map((r) => ({
    id: r.id,
    subject: r.subject,
    createdAt: r.created_at,
    recipientCount: r.recipient_count,
  }));
}

/** Activities with the guests invited to each, so the screen can count who a message to an activity reaches. */
export async function listMessageActivities(client: Client, bookingId: string): Promise<MessageActivity[]> {
  const [{ data: acts }, { data: inv }] = await Promise.all([
    client.from("portal_activities" as never).select("id, title").eq("booking_id", bookingId).order("starts_at", { ascending: true }),
    client.from("portal_activity_invitees" as never).select("activity_id, guest_id").eq("booking_id", bookingId),
  ]);
  const invitees = (inv as unknown as { activity_id: string; guest_id: string }[] | null) ?? [];
  return ((acts as unknown as { id: string; title: string }[] | null) ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    guestIds: invitees.filter((i) => i.activity_id === a.id).map((i) => i.guest_id),
  }));
}
