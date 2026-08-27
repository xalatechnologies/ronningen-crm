import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { notifyInquiryCreated } from "@/lib/notifications/actions/org-events";
import { inboundInquirySchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-inbound-secret";

function readSecret(request: Request): string | null {
  const headerValue = request.headers.get(SECRET_HEADER);
  if (headerValue?.trim()) return headerValue.trim();

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();

  return null;
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function logSourceForNotes(source: string | undefined): string {
  const label = source?.trim() || "website";
  return `[Kilde: ${label}]`;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.INBOUND_INQUIRY_SECRET?.trim();
  if (!expectedSecret) {
    console.error(
      "[api/inbound/inquiries] INBOUND_INQUIRY_SECRET is not configured.",
    );
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const provided = readSecret(request);
  if (!provided || !secretsMatch(provided, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = inboundInquirySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const payload = parsed.data;

  const admin = createSupabaseAdminClient();

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", payload.organizationSlug)
    .maybeSingle();

  if (orgErr) {
    console.error("[api/inbound/inquiries] org lookup failed", orgErr);
    return NextResponse.json({ error: "org_lookup_failed" }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: "organization_not_found" }, { status: 404 });
  }

  const organizationId = org.id;
  const { customer, inquiry, message, source } = payload;

  let customerId: string | null = null;

  const orFilterParts: string[] = [`phone.eq.${customer.phone}`];
  if (customer.email) orFilterParts.push(`email.eq.${customer.email}`);

  const { data: existingCustomer, error: existingCustomerErr } = await admin
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .or(orFilterParts.join(","))
    .limit(1)
    .maybeSingle();

  if (existingCustomerErr) {
    console.error(
      "[api/inbound/inquiries] existing customer lookup failed",
      existingCustomerErr,
    );
    return NextResponse.json({ error: "customer_lookup_failed" }, { status: 500 });
  }

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: createCustomerErr } = await admin
      .from("customers")
      .insert({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        address: customer.address || null,
        organization_id: organizationId,
      })
      .select("id")
      .single();

    if (createCustomerErr || !newCustomer) {
      console.error(
        "[api/inbound/inquiries] customer insert failed",
        createCustomerErr,
      );
      return NextResponse.json({ error: "customer_insert_failed" }, { status: 500 });
    }
    customerId = newCustomer.id;
  }

  const sourceTag = logSourceForNotes(source);
  const internalNotes = message ? `${sourceTag} ${message}` : sourceTag;

  const { data: newInquiry, error: inquiryErr } = await admin
    .from("booking_inquiries")
    .insert({
      customer_id: customerId,
      organization_id: organizationId,
      event_type: inquiry.eventType,
      fest_type: inquiry.festType || null,
      preferred_event_date: inquiry.preferredEventDate || null,
      preferred_event_end_date: inquiry.preferredEventEndDate || null,
      guest_count: inquiry.guestCount,
      status: "new",
      internal_notes: internalNotes,
    })
    .select("id")
    .single();

  if (inquiryErr || !newInquiry) {
    console.error("[api/inbound/inquiries] inquiry insert failed", inquiryErr);
    return NextResponse.json({ error: "inquiry_insert_failed" }, { status: 500 });
  }

  const { error: activityErr } = await admin
    .from("booking_inquiry_activities")
    .insert({
      inquiry_id: newInquiry.id,
      kind: "note",
      body: internalNotes,
    });
  if (activityErr) {
    console.warn(
      "[api/inbound/inquiries] activity insert failed (non-fatal)",
      activityErr,
    );
  }

  try {
    await notifyInquiryCreated({
      organizationId,
      inquiryId: newInquiry.id,
    });
  } catch (notifyError) {
    console.warn(
      "[api/inbound/inquiries] notifyInquiryCreated failed (non-fatal)",
      notifyError,
    );
  }

  revalidatePath("/app/inquiries");

  return NextResponse.json(
    { ok: true, inquiryId: newInquiry.id },
    { status: 201 },
  );
}
