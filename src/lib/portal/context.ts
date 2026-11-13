import "server-only";

import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PortalContext = {
  userId: string;
  fullName: string;
  accountId: string;
  organization: { id: string; name: string; logoUrl: string | null };
  booking: {
    id: string;
    eventDate: string | null;
    eventType: string | null;
    guestCount: number | null;
  };
};

export type PortalAccess =
  | { state: "ok"; ctx: PortalContext }
  /** A live customer account whose venue has switched the portal off. */
  | { state: "closed"; organizationName: string }
  | { state: "none" };

/**
 * The signed-in customer's portal access. Resolution: session user → accepted, live portal_accounts row
 * (read through RLS, so it can only ever be the user's own) → that booking. The booking summary is read with
 * the service role but only after the account matched, and only with an explicit safe column list (no notes,
 * prices or payment data). If the venue switched the portal off the customer gets "closed", never data.
 */
export const getPortalAccess = cache(async function getPortalAccess(): Promise<PortalAccess> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) return { state: "none" };
  const user = { id: claims.sub, email: claims.email };

  const { data: account } = await supabase
    .from("portal_accounts" as never)
    .select("id, organization_id, booking_id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .not("accepted_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = account as unknown as { id: string; organization_id: string; booking_id: string } | null;
  if (!row) return { state: "none" };

  const admin = createSupabaseAdminClient();
  const [{ data: booking }, { data: org }, { data: profile }] = await Promise.all([
    admin
      .from("bookings")
      .select("id, event_date, event_type, fest_type, guest_count")
      .eq("id", row.booking_id)
      .eq("organization_id", row.organization_id)
      .maybeSingle(),
    admin.from("organizations").select("id, name, logo_url, portal_enabled" as "id, name, logo_url").eq("id", row.organization_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!booking || !org) return { state: "none" };
  if (!(org as unknown as { portal_enabled?: boolean }).portal_enabled) return { state: "closed", organizationName: org.name };

  return {
    state: "ok",
    ctx: {
    userId: user.id,
    fullName: profile?.full_name?.trim() || user.email || "",
    accountId: row.id,
    organization: { id: org.id, name: org.name, logoUrl: org.logo_url ?? null },
    booking: {
      id: booking.id,
      eventDate: booking.event_date,
      eventType: booking.fest_type || booking.event_type,
      guestCount: booking.guest_count,
    },
    },
  };
});

/** The portal context, or null when there is no customer account or the venue switched the portal off. */
export async function getPortalContext(): Promise<PortalContext | null> {
  const access = await getPortalAccess();
  return access.state === "ok" ? access.ctx : null;
}

export async function hasPortalAccount(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("portal_accounts" as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null)
    .not("accepted_at", "is", null);
  return (count ?? 0) > 0;
}
