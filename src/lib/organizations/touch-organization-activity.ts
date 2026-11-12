import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/admin/supabase-admin";

/** Minimum gap between two writes for the same organization. */
export const ORGANIZATION_ACTIVITY_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Records "last seen" for an organization (shown in platform admin as «Sist aktivitet»).
 * Updates only when the stored value is empty or older than the throttle window,
 * so normal page loads do not cause a write each time. Never throws.
 */
export async function touchOrganizationActivity(
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  try {
    const cutoff = new Date(
      now.getTime() - ORGANIZATION_ACTIVITY_THROTTLE_MS,
    ).toISOString();

    await createSupabaseAdminClient()
      .from("organizations")
      .update({ last_activity_at: now.toISOString() })
      .eq("id", organizationId)
      .or(`last_activity_at.is.null,last_activity_at.lt.${cutoff}`);
  } catch {
    // Activity tracking must never break the app.
  }
}
