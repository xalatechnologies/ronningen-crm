"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { generateFeedToken } from "@/lib/calendar/feed-tokens";
import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";

const SETTINGS_PATH = "/app/settings/integrations";

export type FeedRow = {
  id: string;
  organizationId: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string | null;
  rotatedAt: string | null;
};

export type FeedActionResult =
  | { ok: true; feed: FeedRow }
  | { ok: false; error: string };

function mapFeed(row: {
  id: string;
  organization_id: string;
  token: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  rotated_at: string | null;
}): FeedRow {
  return {
    id: row.id,
    organizationId: row.organization_id,
    token: row.token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
    rotatedAt: row.rotated_at,
  };
}

/** Owner-only: create the feed if none exists, otherwise return the current one. */
export async function enableCalendarFeed(
  organizationId: string,
): Promise<FeedActionResult> {
  const owner = await requireOrganizationOwner(organizationId);
  if (!owner.ok) return owner;

  const admin = createSupabaseAdminClient();

  const { data: existing, error: existingErr } = await admin
    .from("organization_calendar_feeds")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingErr) return { ok: false, error: existingErr.message };
  if (existing) return { ok: true, feed: mapFeed(existing) };

  const { data: created, error: insertErr } = await admin
    .from("organization_calendar_feeds")
    .insert({
      organization_id: organizationId,
      token: generateFeedToken(),
      created_by_user_id: owner.owner.userId,
    })
    .select("*")
    .single();

  if (insertErr || !created) {
    return { ok: false, error: insertErr?.message ?? "insert_failed" };
  }

  revalidatePath(SETTINGS_PATH);
  return { ok: true, feed: mapFeed(created) };
}

/** Owner-only: swap the token; the old URL immediately 404s. */
export async function rotateCalendarFeed(
  organizationId: string,
): Promise<FeedActionResult> {
  const owner = await requireOrganizationOwner(organizationId);
  if (!owner.ok) return owner;

  const admin = createSupabaseAdminClient();

  const { data: updated, error: updateErr } = await admin
    .from("organization_calendar_feeds")
    .update({
      token: generateFeedToken(),
      rotated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (updateErr || !updated) {
    return { ok: false, error: updateErr?.message ?? "rotate_failed" };
  }

  revalidatePath(SETTINGS_PATH);
  return { ok: true, feed: mapFeed(updated) };
}

/** Owner-only: delete the feed row. External subscribers all 404 afterwards. */
export async function disableCalendarFeed(
  organizationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await requireOrganizationOwner(organizationId);
  if (!owner.ok) return owner;

  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("organization_calendar_feeds")
    .delete()
    .eq("organization_id", organizationId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}
