"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { containsLink, guestMessageSchema, MAX_DAILY_MESSAGES, normalizeMessageBody, type GuestMessageInput } from "./guest-message-rules";
import { sendGuestMessageEmail } from "./guest-mail";
import { issueGuestToken, revokeToken } from "./guest-tokens";
import { getInviteDesign } from "./invite-design";
import { MAX_DAILY_EMAILS, MAX_DAILY_EMAILS_ORG, MAX_DAILY_EMAILS_PLATFORM } from "./rsvp-rules";

export type SendMessageResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: "forbidden" | "invalid" | "links" | "disabled" | "no_design" | "limit" | "nobody" | "failed" };

type GuestRow = { id: string; name: string; email: string | null };

/**
 * The customer e-mails a free-text message to (part of) their guest list. Same guard rails as the invitation:
 * the venue's switch must be on and the invitation published, the recipients are claimed inside the database
 * under the per-booking lock (eligibility, the daily e-mail caps and the daily message limit are enforced
 * there), and a pending row is written before anything is sent.
 */
export async function sendGuestMessage(input: GuestMessageInput): Promise<SendMessageResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = guestMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const subject = parsed.data.subject;
  const body = normalizeMessageBody(parsed.data.body);
  if (containsLink(subject) || containsLink(body)) return { ok: false, error: "links" };

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

  // An activity must belong to this booking (the database re-checks nothing about it beyond the invitee rows).
  if (parsed.data.audience === "activity") {
    const { data: activity } = await admin
      .from("portal_activities" as never)
      .select("id")
      .eq("id", parsed.data.activityId as string)
      .eq("booking_id", ctx.booking.id)
      .maybeSingle();
    if (!activity) return { ok: false, error: "invalid" };
  }

  const { data: auth } = await supabase.auth.getUser();
  const { data: created, error: createError } = await admin
    .from("portal_guest_messages" as never)
    .insert({
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      subject,
      body,
      audience: parsed.data.audience,
      activity_id: parsed.data.audience === "activity" ? parsed.data.activityId : null,
      created_by: auth.user?.id ?? null,
    } as never)
    .select("id")
    .single();
  const messageId = (created as { id: string } | null)?.id;
  if (createError || !messageId) return { ok: false, error: "failed" };
  const dropMessage = () => admin.from("portal_guest_messages" as never).delete().eq("id", messageId).then(undefined, () => undefined);

  // Already at the daily message limit? (The database enforces it as well; this only gives a clear answer.)
  const { count: recent } = await admin
    .from("portal_guest_messages" as never)
    .select("id", { count: "exact", head: true })
    .eq("booking_id", ctx.booking.id)
    .gt("recipient_count", 0)
    .gt("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString());
  if ((recent ?? 0) >= MAX_DAILY_MESSAGES) {
    await dropMessage();
    return { ok: false, error: "limit" };
  }

  const { data: claimed, error: claimError } = await admin.rpc("portal_claim_guest_message" as never, {
    p_booking_id: ctx.booking.id,
    p_message_id: messageId,
    p_cap: MAX_DAILY_EMAILS,
    p_org_cap: MAX_DAILY_EMAILS_ORG,
    p_platform_cap: MAX_DAILY_EMAILS_PLATFORM,
    p_message_cap: MAX_DAILY_MESSAGES,
  } as never);
  if (claimError) {
    await dropMessage();
    return { ok: false, error: "failed" };
  }
  const claims = (claimed as unknown as { claim_email_id: string; claim_guest_id: string }[] | null) ?? [];
  if (claims.length === 0) {
    await dropMessage();
    return { ok: false, error: "nobody" };
  }

  const { data: rows } = await admin
    .from("portal_guests" as never)
    .select("id, name, email")
    .in(
      "id",
      claims.map((c) => c.claim_guest_id),
    );
  const byId = new Map(((rows as unknown as GuestRow[] | null) ?? []).map((g) => [g.id, g]));
  const { t } = await getServerTranslation();
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
      const result = await sendGuestMessageEmail({
        to: g.email,
        token,
        attemptId: claim.claim_email_id,
        guestName: g.name,
        hostName: ctx.fullName,
        hostEmail: auth.user?.email ?? null,
        venueName: ctx.organization.name,
        heading: subject,
        body,
        paletteKey: design.paletteKey,
        t,
      });
      if (!result.ok) throw new Error(result.error.slice(0, 300));
      await finish(claim.claim_email_id, { status: result.testSkipped ? "skipped" : "sent", provider_message_id: result.id ?? null });
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

  await admin.from("portal_guest_messages" as never).update({ recipient_count: sent } as never).eq("id", messageId);
  revalidatePath("/portal", "layout");
  return { ok: true, sent, failed };
}
