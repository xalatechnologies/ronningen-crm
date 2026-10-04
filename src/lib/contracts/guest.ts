import { cookies } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { contractFrom } from "@/lib/contracts/db";
import {
  generateOtpCode,
  generateSecretToken,
  hashOtp,
  hashSecretToken,
  isSecretTokenShape,
} from "@/lib/contracts/crypto";
import { sendContractOtpEmail } from "@/lib/contracts/mail";
import { ensureAcceptedPdf } from "@/lib/contracts/jobs";
import type { FrozenContractDocument } from "@/lib/contracts/types";

export const CONTRACT_SESSION_COOKIE = "em_contract_session";

const rate = new Map<string, { count: number; ts: number }>();

export function rateLimit(key: string, max = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const row = rate.get(key);
  if (!row || now - row.ts > windowMs) {
    rate.set(key, { count: 1, ts: now });
    return true;
  }
  if (row.count >= max) return false;
  row.count += 1;
  return true;
}

export async function exchangeInvite(token: string): Promise<{
  ok: boolean;
  error?: string;
  sessionToken?: string;
  status?: string;
}> {
  if (!isSecretTokenShape(token)) return { ok: false, error: "not_found" };
  const admin = createSupabaseAdminClient();
  const lookup = await admin.rpc("contract_lookup_invite" as never, {
    p_token_hash: hashSecretToken(token),
  } as never);
  const found = lookup.data as {
    organizationId: string;
    versionId: string;
    status: string;
  } | null;
  if (!found) return { ok: false, error: "not_found" };

  const { data: version } = await contractFrom(admin, "rental_contract_versions")
    .select("frozen_document, status")
    .eq("id", found.versionId)
    .maybeSingle();
  const doc = (version as { frozen_document?: FrozenContractDocument } | null)
    ?.frozen_document;
  const email = doc?.customer.email;
  if (!email) return { ok: false, error: "not_found" };

  const sessionToken = generateSecretToken();
  const opened = await admin.rpc("contract_open_session" as never, {
    payload: {
      invite_token_hash: hashSecretToken(token),
      session_token_hash: hashSecretToken(sessionToken),
      email,
    },
  } as never);
  if (!opened.data) return { ok: false, error: "not_found" };

  const jar = await cookies();
  jar.set(CONTRACT_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return { ok: true, sessionToken, status: found.status };
}

export async function sessionTokenFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CONTRACT_SESSION_COOKIE)?.value ?? null;
  if (!value || !isSecretTokenShape(value)) return null;
  return value;
}

export async function loadCurrentDocument(sessionToken: string) {
  const admin = createSupabaseAdminClient();
  const { data: session } = await contractFrom(admin, "contract_signing_sessions")
    .select("version_id, email, otp_verified_at, expires_at, consumed_at")
    .eq("session_token_hash", hashSecretToken(sessionToken))
    .maybeSingle();
  if (!session) return null;
  const sess = session as {
    version_id: string;
    email: string;
    otp_verified_at: string | null;
    expires_at: string;
    consumed_at: string | null;
  };
  if (new Date(sess.expires_at).getTime() <= Date.now()) return null;

  const { data: version } = await contractFrom(admin, "rental_contract_versions")
    .select(
      "id, organization_id, contract_id, status, processing_status, frozen_document, content_hash, version_number, expires_at",
    )
    .eq("id", sess.version_id)
    .maybeSingle();
  if (!version) return null;
  const v = version as {
    id: string;
    organization_id: string;
    contract_id: string;
    status: string;
    processing_status: string;
    frozen_document: FrozenContractDocument;
    content_hash: string;
    version_number: number;
    expires_at: string | null;
  };
  return {
    email: sess.email,
    otpVerified: Boolean(sess.otp_verified_at),
    sessionConsumed: Boolean(sess.consumed_at),
    version: v,
  };
}

export async function requestOtp(sessionToken: string, ip: string) {
  if (!rateLimit(`otp:${ip}`, 5)) return { ok: false as const, error: "rate_limited" };
  const current = await loadCurrentDocument(sessionToken);
  if (!current) return { ok: false as const, error: "not_found" };
  if (current.version.status === "accepted") {
    return { ok: false as const, error: "already_accepted" };
  }
  const code = generateOtpCode();
  const admin = createSupabaseAdminClient();
  const stored = await admin.rpc("contract_store_otp" as never, {
    p_session_token_hash: hashSecretToken(sessionToken),
    p_otp_hash: hashOtp(code, hashSecretToken(sessionToken)),
    p_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  } as never);
  if (!stored.data) return { ok: false as const, error: "not_found" };
  const mailed = await sendContractOtpEmail({ to: current.email, code });
  if (!mailed.ok) {
    console.warn("[contracts] OTP email skipped", mailed.error, code);
  }
  return { ok: true as const };
}

export async function confirmOtp(sessionToken: string, code: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.rpc("contract_confirm_otp" as never, {
    p_session_token_hash: hashSecretToken(sessionToken),
    p_otp_hash: hashOtp(code.trim(), hashSecretToken(sessionToken)),
  } as never);
  if (!data) return { ok: false as const, error: "invalid_code" };
  return { ok: true as const };
}

export async function recordView(sessionToken: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.rpc("contract_record_view" as never, {
    p_session_token_hash: hashSecretToken(sessionToken),
  } as never);
  return data;
}

export async function acceptContract(input: {
  sessionToken: string;
  fullName: string;
  termsAccepted: boolean;
  readAccepted: boolean;
  contentHash: string;
  idempotencyKey: string;
  ip: string | null;
  userAgent: string | null;
  companyAuthority: boolean;
}) {
  const current = await loadCurrentDocument(input.sessionToken);
  if (!current) return { ok: false as const, error: "not_found" };
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("contract_accept" as never, {
    payload: {
      session_token_hash: hashSecretToken(input.sessionToken),
      content_hash: input.contentHash,
      full_name: input.fullName,
      terms_accepted: input.termsAccepted,
      read_accepted: input.readAccepted,
      company_authority: input.companyAuthority,
      customer_name: current.version.frozen_document.customer.name,
      company_name: current.version.frozen_document.customer.companyName,
      declaration_version: current.version.frozen_document.declarationVersion,
      idempotency_key: input.idempotencyKey,
      ip: input.ip,
      user_agent: input.userAgent,
    },
  } as never);
  if (error) return { ok: false as const, error: error.message };
  try {
    const { notifyContractAccepted } = await import(
      "@/lib/notifications/actions/org-events"
    );
    await notifyContractAccepted({
      organizationId: current.version.organization_id,
      bookingId: current.version.frozen_document.booking.reservationId,
      signerName: input.fullName.trim(),
      bookingReference: current.version.frozen_document.booking.reference,
    });
  } catch (notifyError) {
    console.error("[contracts] staff notify after accept failed", notifyError);
  }
  try {
    await ensureAcceptedPdf(current.version.id);
  } catch (pdfError) {
    console.error("[contracts] PDF after accept failed", pdfError);
  }
  return { ok: true as const, result: data };
}
