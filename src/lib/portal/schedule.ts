import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { scheduleContentHash } from "./schedule-hash";
import { sortEntries, type ScheduleEntry } from "./schedule-rules";

type Client = SupabaseClient<Database>;

type ItemRow = {
  id: string;
  start_time: string;
  duration_min: number | null;
  title: string;
  note: string | null;
  responsible: string | null;
};
type VersionRow = {
  id: string;
  version: number;
  items: ScheduleEntry[];
  content_hash: string;
  shared_at: string;
  acknowledged_at: string | null;
  staff_note: string | null;
};

export type ScheduleVersion = {
  id: string;
  version: number;
  items: ScheduleEntry[];
  contentHash: string;
  sharedAt: string;
  acknowledgedAt: string | null;
  staffNote: string | null;
};

/** The customer's working copy (RLS: only the customer can read it; venue staff cannot). */
export async function listScheduleItems(client: Client, bookingId: string): Promise<ScheduleEntry[]> {
  const { data } = await client
    .from("portal_schedule_items" as never)
    .select("id, start_time, duration_min, title, note, responsible")
    .eq("booking_id", bookingId);
  return sortEntries(
    ((data as unknown as ItemRow[] | null) ?? []).map((r) => ({
      id: r.id,
      startTime: r.start_time.slice(0, 5),
      durationMin: r.duration_min,
      title: r.title,
      note: r.note,
      responsible: r.responsible,
    })),
  );
}

/** Shared versions, newest first. Both sides can read them. */
export async function listScheduleVersions(client: Client, bookingId: string): Promise<ScheduleVersion[]> {
  const { data } = await client
    .from("portal_schedule_versions" as never)
    .select("id, version, items, content_hash, shared_at, acknowledged_at, staff_note")
    .eq("booking_id", bookingId)
    .order("version", { ascending: false });
  return ((data as unknown as VersionRow[] | null) ?? []).map((v) => ({
    id: v.id,
    version: v.version,
    items: v.items,
    contentHash: v.content_hash,
    sharedAt: v.shared_at,
    acknowledgedAt: v.acknowledged_at,
    staffNote: v.staff_note,
  }));
}

export { scheduleContentHash };

/** Latest shared version still waiting for the venue's confirmation (staff badge). */
export async function countUnacknowledged(client: Client, bookingId: string): Promise<number> {
  const { data } = await client
    .from("portal_schedule_versions" as never)
    .select("acknowledged_at")
    .eq("booking_id", bookingId)
    .order("version", { ascending: false })
    .limit(1);
  const latest = (data as unknown as { acknowledged_at: string | null }[] | null)?.[0];
  return latest && !latest.acknowledged_at ? 1 : 0;
}

/** Whether the booking has an invitation to show the plan on, and whether the customer turned it on. */
export async function getGuestSharing(client: Client, bookingId: string): Promise<{ hasInvite: boolean; enabled: boolean }> {
  const { data } = await client
    .from("portal_invite_designs" as never)
    .select("show_schedule")
    .eq("booking_id", bookingId)
    .maybeSingle();
  const row = data as unknown as { show_schedule: boolean } | null;
  return { hasInvite: Boolean(row), enabled: row?.show_schedule ?? false };
}
