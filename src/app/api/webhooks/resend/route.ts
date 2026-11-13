import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { deliveryFromEvent, shouldApplyDelivery, verifyResendSignature } from "@/lib/portal/resend-webhook";

export const runtime = "nodejs";

/**
 * Resend delivery events for guest e-mails. Signed (Svix), so nothing unsigned changes anything.
 * Unknown events and unknown message ids are acknowledged with 200 so Resend does not keep retrying them.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const body = await request.text();
  const valid = verifyResendSignature({
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    body,
    secret,
  });
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const meaning = deliveryFromEvent(event.type ?? "");
  const messageId = event.data?.email_id;
  if (!meaning || !messageId) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("portal_guest_emails" as never)
    .select("id, guest_id, delivery")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  const email = row as unknown as { id: string; guest_id: string | null; delivery: string | null } | null;
  if (!email || !shouldApplyDelivery(email.delivery, meaning.delivery)) return NextResponse.json({ ok: true });

  await admin
    .from("portal_guest_emails" as never)
    .update({ delivery: meaning.delivery, delivery_at: new Date().toISOString() } as never)
    .eq("id", email.id);
  if (email.guest_id) {
    await admin
      .from("portal_guests" as never)
      .update({ delivery_issue: meaning.issue } as never)
      .eq("id", email.guest_id);
  }
  return NextResponse.json({ ok: true });
}
