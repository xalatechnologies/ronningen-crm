"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { sendGuestInviteEmail, safeName } from "./guest-mail";
import { issueGuestToken, revokeToken } from "./guest-tokens";
import { getInviteDesign } from "./invite-design";
import { selectRecipients, type SendCandidate } from "./rsvp-rules";

export type SendGuestsResult =
  | { ok: true; sent: number; failed: number; capped: number }
  | { ok: false; error: "disabled" | "no_design" | "nothing" | "failed" | "forbidden" };

type GuestRow = { id: string; name: string; email: string | null; status: SendCandidate["status"]; opted_out: boolean; last_sent_at: string | null; send_count: number };

/**
 * The customer e-mails their guests. Needs: the venue's switch on, a published invitation. Limits: only
 * guests on the list with an address, 300 e-mails per booking per rolling day, reminders at most every 3
 * days, nobody who stopped reminders. The booking always comes from the session.
 */
export async function sendGuestEmails(mode: "invite" | "reminder"): Promise<SendGuestsResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("portal_guest_invites_enabled" as "id")
    .eq("id", ctx.organization.id)
    .maybeSingle();
  if (!(org as unknown as { portal_guest_invites_enabled?: boolean } | null)?.portal_guest_invites_enabled) {
    return { ok: false, error: "disabled" };
  }

  const supabase = await createServerSupabaseClient();
  const design = await getInviteDesign(supabase, ctx.booking.id);
  if (!design || design.status !== "published") return { ok: false, error: "no_design" };

  const [{ data: rows }, { count: sentToday }, { data: auth }] = await Promise.all([
    admin
      .from("portal_guests" as never)
      .select("id, name, email, status, opted_out, last_sent_at, send_count")
      .eq("booking_id", ctx.booking.id),
    admin
      .from("portal_guest_emails" as never)
      .select("id", { count: "exact", head: true })
      .eq("booking_id", ctx.booking.id)
      .in("status", ["sent", "skipped"])
      .gte("sent_at", new Date(Date.now() - 86_400_000).toISOString()),
    supabase.auth.getUser(),
  ]);
  const guests = (rows as unknown as GuestRow[] | null) ?? [];
  const byId = new Map(guests.map((g) => [g.id, g]));

  const { send, skippedForCap } = selectRecipients(
    guests.map((g) => ({ id: g.id, email: g.email, status: g.status, optedOut: g.opted_out, lastSentAt: g.last_sent_at })),
    mode,
    sentToday ?? 0,
  );
  if (send.length === 0) return skippedForCap > 0 ? { ok: true, sent: 0, failed: 0, capped: skippedForCap } : { ok: false, error: "nothing" };

  const { t } = await getServerTranslation();
  const hostEmail = auth.user?.email ?? null;
  let sent = 0;
  let failed = 0;

  const one = async (candidate: SendCandidate) => {
    const g = byId.get(candidate.id)!;
    const token = await issueGuestToken(admin, g.id);
    if (!token) return void failed++;
    const result = await sendGuestInviteEmail({
      to: g.email!,
      token,
      guestId: g.id,
      kind: mode,
      sendCount: g.send_count,
      guestName: g.name,
      hostName: safeName(ctx.fullName),
      hostEmail,
      venueName: ctx.organization.name,
      headline: design.headline,
      dateText: [design.eventDateText, design.eventTimeText].filter(Boolean).join(" · "),
      placeText: design.placeText,
      paletteKey: design.paletteKey,
      t,
    });
    const status = result.ok ? (result.testSkipped ? "skipped" : "sent") : "failed";
    await admin.from("portal_guest_emails" as never).insert({
      organization_id: ctx.organization.id,
      booking_id: ctx.booking.id,
      guest_id: g.id,
      kind: mode,
      status,
      provider_message_id: result.ok ? (result.id ?? null) : null,
      error: result.ok ? null : result.error.slice(0, 300),
    } as never);
    if (!result.ok) {
      await revokeToken(admin, token); // the link was never delivered
      return void failed++;
    }
    await admin
      .from("portal_guests" as never)
      .update({
        ...(mode === "invite" ? { status: "invited" } : {}),
        last_sent_at: new Date().toISOString(),
        send_count: g.send_count + 1,
      } as never)
      .eq("id", g.id);
    sent++;
  };

  for (let i = 0; i < send.length; i += 10) {
    await Promise.all(send.slice(i, i + 10).map(one));
  }

  revalidatePath("/portal", "layout");
  return { ok: true, sent, failed, capped: skippedForCap };
}
