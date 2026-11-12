import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Database } from "@/types/database.types";
import type { ActivityAnswer, ActivityAudience, ActivityResponse, ActivityRow } from "./activity-rules";
import { countActivity, spotsLeft, type ActivityCounts } from "./activity-rules";

type Client = SupabaseClient<Database>;

type ActRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  audience: ActivityAudience;
  capacity: number | null;
};
type InvRow = { activity_id: string; guest_id: string; response: ActivityResponse | null; people: number | null };

const toRow = (r: ActRow): ActivityRow => ({
  id: r.id,
  title: r.title,
  description: r.description,
  location: r.location,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  audience: r.audience,
  capacity: r.capacity,
});

export type CustomerActivity = { activity: ActivityRow; answers: ActivityAnswer[]; counts: ActivityCounts };

/** The customer's activities with every guest's answer. `client` is RLS-scoped; names come from the guest list. */
export async function listActivities(
  client: Client,
  bookingId: string,
): Promise<{ items: CustomerActivity[]; guests: { id: string; name: string }[] }> {
  const [{ data: acts }, { data: inv }, { data: guests }] = await Promise.all([
    client
      .from("portal_activities" as never)
      .select("id, title, description, location, starts_at, ends_at, audience, capacity")
      .eq("booking_id", bookingId)
      .order("starts_at", { ascending: true }),
    client.from("portal_activity_invitees" as never).select("activity_id, guest_id, response, people").eq("booking_id", bookingId),
    client.from("portal_guests" as never).select("id, name").eq("booking_id", bookingId).order("name", { ascending: true }),
  ]);
  const guestList = ((guests as unknown as { id: string; name: string }[] | null) ?? []).map((g) => ({ id: g.id, name: g.name }));
  const invRows = (inv as unknown as InvRow[] | null) ?? [];
  const allIds = guestList.map((g) => g.id);
  const items = ((acts as unknown as ActRow[] | null) ?? []).map((r) => {
    const activity = toRow(r);
    const answers = invRows
      .filter((i) => i.activity_id === r.id)
      .map((i) => ({ guestId: i.guest_id, response: i.response, people: i.people }));
    return { activity, answers, counts: countActivity(activity, allIds, answers) };
  });
  return { items, guests: guestList };
}

export async function countActivities(client: Client, bookingId: string): Promise<number> {
  const { count } = await client
    .from("portal_activities" as never)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  return count ?? 0;
}

export type GuestActivity = {
  activity: ActivityRow;
  myResponse: ActivityResponse | null;
  yesPeople: number;
  spotsLeft: number | null;
};

/**
 * What one guest sees: activities for their booking that they are invited to (all, or an invitee row), with
 * their own answer and public counts (numbers only, never other guests' names). Service role, scoped to the
 * guest the validated link belongs to.
 */
export async function listGuestActivities(guestId: string, bookingId: string): Promise<GuestActivity[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: acts }, { data: rows }] = await Promise.all([
    admin
      .from("portal_activities" as never)
      .select("id, title, description, location, starts_at, ends_at, audience, capacity")
      .eq("booking_id", bookingId)
      .order("starts_at", { ascending: true }),
    admin.from("portal_activity_invitees" as never).select("activity_id, guest_id, response, people").eq("booking_id", bookingId),
  ]);
  const inv = (rows as unknown as InvRow[] | null) ?? [];
  return ((acts as unknown as ActRow[] | null) ?? [])
    .filter((a) => a.audience === "all" || inv.some((i) => i.activity_id === a.id && i.guest_id === guestId))
    .map((a) => {
      const yes = inv.filter((i) => i.activity_id === a.id && i.response === "yes").reduce((sum, i) => sum + (i.people ?? 1), 0);
      return {
        activity: toRow(a),
        myResponse: inv.find((i) => i.activity_id === a.id && i.guest_id === guestId)?.response ?? null,
        yesPeople: yes,
        spotsLeft: spotsLeft(a.capacity, yes),
      };
    });
}
