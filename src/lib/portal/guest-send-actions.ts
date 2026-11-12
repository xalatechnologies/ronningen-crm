"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { sendGuestInviteEmail } from "./guest-mail";
import { issueGuestToken, revokeToken } from "./guest-tokens";
import { getInviteDesign } from "./invite-design";
import { MAX_DAILY_EMAILS, MAX_DAILY_EMAILS_ORG, MAX_DAILY_EMAILS_PLATFORM, selectRecipients } from "./rsvp-rules";

export type SendGuestsResult =
  | { ok: true; sent: number; failed: number; capped: number }
  | { ok: false; error: "disabled" | "no_design" | "nothing" | "failed" | "forbidden" };

type GuestRow = { id: string; name: string; email: string | null; status: "not_sent" | "invited" | "accepted" | "declined" | "maybe"; opted_out: boolean; last_sent_at: string | null; send_count: number };

/**
 * The customer e-mails their guests. Needs: the portal AND guest invites switched on by the venue, and a
 * published invitation. The database claims the recipients atomically (per-booking lock): eligibility is
 * re-checked there, the booking / organization / platform daily caps are enforced there, and a pending row
 * is written before anything is sent, so overlapping sends can never mail the same guest twice or exceed a cap.
 */
export async function sendGuestEmails(mode: "invite" | "reminder"): Promise<SendGuestsResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("portal_enabled, portal_guest_invites_enabled" as "id")
    .eq("id", ctx.organization.id)
    .maybeSingle();
  const flags = org as unknown as { portal_enabled?: boolean; portal_guest_invites_enabled?: boolean } | null;
  if (!flags?.portal_enabled || !flags.portal_guest_invites_enabled) return { ok: false, error: "disabled" };

  const supabase = await createServerSupabaseClient();
  const design = await getInviteDesign(supabase, ctx.booking.id);
  if (!design || design.status !== "published") return { ok: false, error: "no_design" };

  const { data: claimed, error: claimError } = await admin.rpc("portal_claim_guest_sends" as never, {
    p_booking_id: ctx.booking.id,
    p_kind: mode,
    p_cap: MAX_DAILY_EMAILS,
    p_org_cap: MAX_DAILY_EMAILS_ORG,
    p_platform_cap: MAX_DAILY_EMAILS_PLATFORM,
  } as never);
  if (claimError) return { ok: false, error: "failed" };
  const claims = (claimed as unknown as { claim_email_id: string; claim_guest_id: string }[] | null) ?? [];

  // What the caller could have sent, to tell "nothing to do" apart from "held back by a daily cap".
  const { data: all } = await admin
    .from("portal_guests" as never)
    .select("id, name, email, status, opted_out, last_sent_at, send_count")
    .eq("booking_id", ctx.booking.id);
  const guests = (all as unknown as GuestRow[] | null) ?? [];
  const eligible = selectRecipients(
    guests.map((g) => ({ id: g.id, email: g.email, status: g.status, optedOut: g.opted_out, lastSentAt: g.last_sent_at })),
    mode,
    0,
  ).send.length;

  if (claims.length === 0) {
    return eligible > 0 ? { ok: true, sent: 0, failed: 0, capped: eligible } : { ok: false, error: "nothing" };
  }

  const byId = new Map(guests.map((g) => [g.id, g]));
  const { t } = await getServerTranslation();
  const { data: auth } = await supabase.auth.getUser();
  const hostEmail = auth.user?.email ?? null;
  let sent = 0;
  let failed = 0;

  const finish = (emailId: string, patch: Record<string, unknown>) =>
    admin.from("portal_guest_emails" as never).update({ ...patch, sent_at: new Date().toISOString() } as never).eq("id", emailId);

  const one = async (claim: { claim_email_id: string; claim_guest_id: string }) => {
    const g = byId.get(claim.claim_guest_id);
    if (!g?.email) {
      await finish(claim.claim_email_id, { status: "failed", error: "guest_missing" });
      return void failed++;
    }
    let token: string | null = null;
    try {
      token = await issueGuestToken(admin, g.id);
      if (!token) throw new Error("token");
      const result = await sendGuestInviteEmail({
        to: g.email,
        token,
        guestId: g.id,
        kind: mode,
        attemptId: claim.claim_email_id,
        guestName: g.name,
        hostName: ctx.fullName,
        hostEmail,
        venueName: ctx.organization.name,
        headline: design.headline,
        dateText: [design.eventDateText, design.eventTimeText].filter(Boolean).join(" · "),
        placeText: design.placeText,
        paletteKey: design.paletteKey,
        t,
      });
      if (!result.ok) throw new Error(result.error.slice(0, 300));
      await finish(claim.claim_email_id, { status: result.testSkipped ? "skipped" : "sent", provider_message_id: result.id ?? null });
      await admin
        .from("portal_guests" as never)
        .update({ ...(mode === "invite" ? { status: "invited" } : {}), last_sent_at: new Date().toISOString(), send_count: g.send_count + 1 } as never)
        .eq("id", g.id);
      sent++;
    } catch (error) {
      if (token) await revokeToken(admin, token).catch(() => undefined); // never delivered, so never valid
      await finish(claim.claim_email_id, { status: "failed", error: error instanceof Error ? error.message.slice(0, 300) : "failed" }).then(undefined, () => undefined);
      failed++;
    }
  };

  for (let i = 0; i < claims.length; i += 10) {
    await Promise.allSettled(claims.slice(i, i + 10).map(one));
  }

  revalidatePath("/portal", "layout");
  return { ok: true, sent, failed, capped: Math.max(0, eligible - claims.length) };
}
