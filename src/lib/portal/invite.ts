import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { generateSecretToken, hashSecretToken, isSecretTokenShape } from "@/lib/contracts/crypto";
import { getServerTranslation } from "@/i18n/server";
import { portalAccountsTable } from "./db";
import { sendPortalInviteEmail } from "./mail";
import {
  portalInviteExpiry,
  portalInviteState,
  shouldAutoInvite,
  type PortalAccountRow,
  type PortalInviteState,
} from "./rules";

export type IssueInviteResult =
  | { ok: true; emailed: boolean }
  | { ok: false; error: "not_found" | "no_email" | "already_active" | "db_error" };

/**
 * Creates (or re-issues) the portal invitation for a booking's customer and e-mails it.
 * Caller MUST have authorized the action (staff of the booking's organization, or the contract
 * acceptance hook). Organization and customer are resolved from the booking, never from input.
 */
export async function issuePortalInvite(input: {
  organizationId: string;
  bookingId: string;
  invitedBy: string | null;
}): Promise<IssueInviteResult> {
  const admin = createSupabaseAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, customer_id, organization_id")
    .eq("id", input.bookingId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!booking?.customer_id) return { ok: false, error: "not_found" };

  const [{ data: customer }, { data: org }] = await Promise.all([
    admin
      .from("customers")
      .select("name, email")
      .eq("id", booking.customer_id)
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", input.organizationId).maybeSingle(),
  ]);
  const email = customer?.email ? normalizeEmail(customer.email) : "";
  if (!customer || !email) return { ok: false, error: "no_email" };

  const { data: live } = await portalAccountsTable(admin)
    .select("id, accepted_at")
    .eq("booking_id", input.bookingId)
    .eq("email", email)
    .is("revoked_at", null)
    .maybeSingle();
  const existing = live as { id: string; accepted_at: string | null } | null;
  if (existing?.accepted_at) return { ok: false, error: "already_active" };

  const token = generateSecretToken();
  let accountId = existing?.id;
  if (accountId) {
    const { error } = await portalAccountsTable(admin)
      .update({ token_hash: hashSecretToken(token), expires_at: portalInviteExpiry() } as never)
      .eq("id", accountId);
    if (error) return { ok: false, error: "db_error" };
  } else {
    const { data: created, error } = await portalAccountsTable(admin)
      .insert({
        organization_id: input.organizationId,
        booking_id: input.bookingId,
        customer_id: booking.customer_id,
        email,
        token_hash: hashSecretToken(token),
        expires_at: portalInviteExpiry(),
        invited_by: input.invitedBy,
      } as never)
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: "db_error" };
    accountId = (created as unknown as { id: string }).id;
  }

  const { t } = await getServerTranslation();
  const sent = await sendPortalInviteEmail({
    to: email,
    token,
    accountId,
    organizationName: org?.name ?? "",
    customerName: customer.name ?? "",
    t,
  });
  return { ok: true, emailed: sent.ok };
}

/** Called after a customer signs a contract. Best effort: staff can always resend from the booking. */
export async function autoInviteAfterContractAccepted(input: {
  organizationId: string;
  bookingId: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  // New columns are not in the generated types yet.
  const { data } = await admin
    .from("organizations")
    .select("portal_enabled, portal_auto_invite" as "id")
    .eq("id", input.organizationId)
    .maybeSingle();
  const org = data as unknown as { portal_enabled: boolean; portal_auto_invite: boolean } | null;
  if (!org || !shouldAutoInvite(org)) return;
  await issuePortalInvite({ ...input, invitedBy: null });
}

export type PortalInvitePreview = {
  id: string;
  organizationName: string;
  email: string;
  customerName: string;
  state: PortalInviteState;
};

/** Looks an invitation up by its raw token (only the hash is stored). Null for unknown tokens. */
export async function getPortalInvitePreview(token: string): Promise<PortalInvitePreview | null> {
  if (!isSecretTokenShape(token)) return null;
  const admin = createSupabaseAdminClient();
  const { data } = await portalAccountsTable(admin)
    .select("id, organization_id, booking_id, customer_id, email, user_id, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashSecretToken(token))
    .maybeSingle();
  const row = data as unknown as PortalAccountRow | null;
  if (!row) return null;

  const [{ data: org }, { data: customer }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", row.organization_id).maybeSingle(),
    admin.from("customers").select("name").eq("id", row.customer_id).maybeSingle(),
  ]);
  return {
    id: row.id,
    organizationName: org?.name ?? "",
    email: row.email,
    customerName: customer?.name ?? "",
    state: portalInviteState(row),
  };
}
