import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { FeedRow } from "@/lib/calendar/feed-actions";

/**
 * Fetch the current calendar feed row for an org. Used by the settings page
 * (which has already verified owner access). Returns null if not yet enabled.
 */
export async function fetchCalendarFeedForOrg(
  organizationId: string,
): Promise<FeedRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_calendar_feeds")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[calendar] fetchCalendarFeedForOrg failed", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    token: data.token,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    lastAccessedAt: data.last_accessed_at,
    rotatedAt: data.rotated_at,
  };
}

export function buildFeedUrl(origin: string, token: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/api/calendar/${token}/bookings.ics`;
}
