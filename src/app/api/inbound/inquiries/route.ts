import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import {
  generateClientRequestId,
  normalizeCustomerEmail,
  normalizeCustomerPhone,
} from "@/lib/customers/customer-identity";
import { notifyInquiryCreated } from "@/lib/notifications/actions/org-events";
import { createInquiryAtomic } from "@/lib/reservations/atomic-create";
import { hashOrgIdForLog } from "@/lib/reservations/create-logging";
import { inboundInquirySchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-inbound-secret";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function readClientRequestId(request: Request): string {
  const fromIdempotency = request.headers.get("idempotency-key")?.trim();
  if (fromIdempotency && UUID_RE.test(fromIdempotency)) {
    return fromIdempotency;
  }
  const fromCustom = request.headers.get("x-client-request-id")?.trim();
  if (fromCustom && UUID_RE.test(fromCustom)) {
    return fromCustom;
  }
  try {
    return generateClientRequestId();
  } catch {
    return randomUUID();
  }
}

/**
 * Prefer email match; phone match only when names also match
 * (avoids attaching to unrelated people who share a venue phone).
 */
export function findExistingInboundCustomer<
  T extends { id: string; name: string; email: string | null; phone: string | null },
>(
  candidates: T[],
  input: { name: string; email?: string | null; phone: string },
): T | null {
  const email = normalizeCustomerEmail(input.email ?? null);
  const phone = normalizeCustomerPhone(input.phone);

  if (email) {
    const byEmail = candidates.find(
      (c) => normalizeCustomerEmail(c.email) === email,
    );
    if (byEmail) return byEmail;
  }

  if (phone) {
    const byPhoneAndName = candidates.find(
      (c) =>
        normalizeCustomerPhone(c.phone) === phone &&
        namesMatch(c.name, input.name),
    );
    if (byPhoneAndName) return byPhoneAndName;
  }

  return null;
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
  const clientRequestId = readClientRequestId(request);

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

  const { data: orgCustomers, error: existingCustomerErr } = await admin
    .from("customers")
    .select("id, name, email, phone")
    .eq("organization_id", organizationId);

  if (existingCustomerErr) {
    console.error(
      "[api/inbound/inquiries] existing customer lookup failed",
      existingCustomerErr,
    );
    return NextResponse.json({ error: "customer_lookup_failed" }, { status: 500 });
  }

  const existingCustomer = findExistingInboundCustomer(orgCustomers ?? [], {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  });

  const sourceTag = logSourceForNotes(source);
  const internalNotes = message ? `${sourceTag} ${message}` : sourceTag;

  let result;
  try {
    result = await createInquiryAtomic(admin, {
      organization_id: organizationId,
      client_request_id: clientRequestId,
      customer_id: existingCustomer?.id ?? null,
      customer_name: customer.name,
      customer_email: customer.email || null,
      customer_phone: customer.phone,
      customer_address: customer.address || null,
      event_type: inquiry.eventType,
      fest_type: inquiry.festType || null,
      preferred_event_date: inquiry.preferredEventDate || null,
      preferred_event_end_date: inquiry.preferredEventEndDate || null,
      guest_count: inquiry.guestCount,
      status: "new",
      internal_notes: internalNotes,
    });
  } catch (err) {
    console.error("[api/inbound/inquiries] create_inquiry_atomic failed", {
      orgIdHash: hashOrgIdForLog(organizationId),
      clientRequestId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "inquiry_insert_failed" }, { status: 500 });
  }

  if (!result.reused) {
    const { error: activityErr } = await admin
      .from("booking_inquiry_activities")
      .insert({
        inquiry_id: result.reservationId,
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
        inquiryId: result.reservationId,
      });
    } catch (notifyError) {
      console.warn(
        "[api/inbound/inquiries] notifyInquiryCreated failed (non-fatal)",
        notifyError,
      );
    }
  }

  revalidatePath("/app/inquiries");

  return NextResponse.json(
    {
      ok: true,
      inquiryId: result.reservationId,
      reused: result.reused,
    },
    { status: result.reused ? 200 : 201 },
  );
}
