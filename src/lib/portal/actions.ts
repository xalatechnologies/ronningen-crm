"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { hashSecretToken } from "@/lib/contracts/crypto";
import { type UserRole } from "@/constants/roles";
import { canManageBookings } from "@/lib/organizations/organization-permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { portalAccountsTable } from "./db";
import { getPortalInvitePreview, issuePortalInvite } from "./invite";
import { requireStaffForBooking } from "./staff";

export type SendInviteResult =
  | { ok: true; emailed: boolean }
  | { ok: false; error: string };

/** Staff: send or re-send the portal invitation for one booking. */
export async function sendPortalInvite(bookingId: string): Promise<SendInviteResult> {
  if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "invalid_input" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "authentication_required" };

  // RLS: only members of the booking's organization can read it, so this also resolves the org.
  const { data: booking } = await supabase
    .from("bookings")
    .select("organization_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "forbidden" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", booking.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!canManageBookings((member?.role ?? null) as UserRole | null)) {
    return { ok: false, error: "forbidden" };
  }

  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("portal_enabled")
    .eq("id", booking.organization_id)
    .maybeSingle();
  if (!(org as { portal_enabled?: boolean } | null)?.portal_enabled) {
    return { ok: false, error: "portal_disabled" };
  }

  const result = await issuePortalInvite({
    organizationId: booking.organization_id,
    bookingId,
    invitedBy: user.id,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/app/bookings/${bookingId}`);
  return { ok: true, emailed: result.emailed };
}

export type AcceptPortalResult =
  | { ok: true; redirectTo: string }
  | { ok: false; code: "invalid" | "wrong_account" | "account_exists" | "invalid_input" | "failed" };

const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
});

/**
 * Accepts a portal invitation. Signed in: the account e-mail must match the invitation.
 * Not signed in: creates the account (e-mail is verified by possession of the link) and signs in.
 * Never creates an organization_members row and never sets active_organization_id.
 */
export async function acceptPortalInvite(input: {
  token: string;
  fullName?: string;
  password?: string;
}): Promise<AcceptPortalResult> {
  const preview = await getPortalInvitePreview(input.token);
  if (!preview || preview.state !== "pending") return { ok: false, code: "invalid" };

  const admin = createSupabaseAdminClient();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  let userId: string;
  let signInPassword: string | null = null;

  if (sessionUser) {
    if (normalizeEmail(sessionUser.email ?? "") !== preview.email) {
      return { ok: false, code: "wrong_account" };
    }
    userId = sessionUser.id;
  } else {
    const parsed = signupSchema.safeParse({ fullName: input.fullName, password: input.password });
    if (!parsed.success) return { ok: false, code: "invalid_input" };

    const { data: existing } = await admin.from("profiles").select("id").ilike("email", preview.email).maybeSingle();
    if (existing) return { ok: false, code: "account_exists" };

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: preview.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });
    if (createError || !created.user) {
      const exists = createError?.message?.toLowerCase().includes("already been registered");
      return { ok: false, code: exists ? "account_exists" : "failed" };
    }
    userId = created.user.id;
    signInPassword = parsed.data.password;
  }

  // Claim (atomic, single use). The invitation stays tied to this exact token hash.
  const { data: claimed } = await portalAccountsTable(admin)
    .update({ accepted_at: new Date().toISOString(), user_id: userId } as never)
    .eq("id", preview.id)
    .eq("token_hash", hashSecretToken(input.token))
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (!claimed || (claimed as unknown[]).length === 0) return { ok: false, code: "invalid" };

  if (signInPassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: preview.email,
      password: signInPassword,
    });
    if (signInError) return { ok: true, redirectTo: "/auth/login" };
  }

  return { ok: true, redirectTo: "/portal" };
}

/** Owner/admin: switch the customer portal on or off for the organization. */
export async function setPortalSettings(input: {
  organizationId: string;
  enabled: boolean;
  autoInvite: boolean;
  guestInvites?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z
    .object({ organizationId: z.string().uuid(), enabled: z.boolean(), autoInvite: z.boolean(), guestInvites: z.boolean().optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "authentication_required" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (member?.role !== "owner" && member?.role !== "admin") return { ok: false, error: "forbidden" };

  const { error } = await supabase
    .from("organizations")
    .update({
      portal_enabled: parsed.data.enabled,
      portal_auto_invite: parsed.data.autoInvite,
      ...(parsed.data.guestInvites === undefined ? {} : { portal_guest_invites_enabled: parsed.data.guestInvites }),
    } as never)
    .eq("id", parsed.data.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/settings/kontrakter");
  return { ok: true };
}

/** Staff (owner/admin/manager): cut off the customer's access to this booking's portal immediately. */
export async function revokePortalAccess(bookingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(bookingId).success) return { ok: false, error: "invalid_input" };
  const staff = await requireStaffForBooking(bookingId);
  if (!staff.ok) return { ok: false, error: staff.error };

  const { error } = await portalAccountsTable(createSupabaseAdminClient())
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("booking_id", bookingId)
    .eq("organization_id", staff.organizationId)
    .is("revoked_at", null);
  if (error) return { ok: false, error: "failed" };
  revalidatePath(`/app/bookings/${bookingId}`);
  return { ok: true };
}
