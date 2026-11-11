"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { generateSecretToken, hashSecretToken } from "@/lib/contracts/crypto";
import { getServerTranslation } from "@/i18n/server";
import { roleLabel } from "@/lib/navigation/nav-labels";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { invitationUrl, sendInvitationEmail } from "./mail";
import { getInvitationPreview, invitationsTable } from "./queries";
import { canInviteRole, invitationExpiry, type InvitationRow } from "./rules";

const TEAM_PATH = "/app/settings/team";

export type InviteResult =
  | { ok: true; inviteUrl: string; emailed: boolean }
  | { ok: false; error: string };

/** Signed-in user and their role in the organization (owner/admin only), or an error. */
async function requireTeamManager(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "authentication_required" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (member?.role ?? null) as UserRole | null;
  if (role !== "owner" && role !== "admin") {
    return { ok: false as const, error: "forbidden" };
  }
  return { ok: true as const, user, role, supabase };
}

async function inviterDisplayName(userId: string, fallback: string | null | undefined) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name?.trim() || fallback || "";
}

async function issueAndSend(row: {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  inviterId: string;
  inviterEmail: string | null | undefined;
}): Promise<InviteResult> {
  const { t } = await getServerTranslation();
  const admin = createSupabaseAdminClient();
  const token = generateSecretToken();

  const { error } = await invitationsTable(admin)
    .update({
      token_hash: hashSecretToken(token),
      expires_at: invitationExpiry(),
      revoked_at: null,
    } as never)
    .eq("id", row.id);
  if (error) return { ok: false, error: error.message };

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", row.organizationId)
    .maybeSingle();

  const sent = await sendInvitationEmail({
    to: row.email,
    token,
    invitationId: `${row.id}:${token.slice(0, 8)}`,
    organizationName: org?.name ?? "",
    inviterName: await inviterDisplayName(row.inviterId, row.inviterEmail),
    roleLabel: roleLabel(row.role, t),
    t,
  });

  revalidatePath(TEAM_PATH);
  return { ok: true, inviteUrl: invitationUrl(token), emailed: sent.ok };
}

const createSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().min(3).max(254),
  role: z.enum(USER_ROLES),
});

export async function createInvitation(input: {
  organizationId: string;
  email: string;
  role: string;
}): Promise<InviteResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const email = normalizeEmail(parsed.data.email);
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "invalid_email" };

  const guard = await requireTeamManager(parsed.data.organizationId);
  if (!guard.ok) return guard;
  if (!canInviteRole(guard.role, parsed.data.role)) return { ok: false, error: "forbidden_role" };

  const admin = createSupabaseAdminClient();

  // Already a member? (profiles.email matches the sign-in e-mail)
  const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (profile) {
    const { data: existing } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", parsed.data.organizationId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (existing) return { ok: false, error: "already_member" };
  }

  // One open invitation per e-mail: re-inviting replaces the previous link.
  const { data: open } = await invitationsTable(admin)
    .select("id")
    .eq("organization_id", parsed.data.organizationId)
    .eq("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();

  let invitationId = (open as { id: string } | null)?.id;
  if (invitationId) {
    await invitationsTable(admin).update({ role: parsed.data.role } as never).eq("id", invitationId);
  } else {
    const { data: created, error } = await invitationsTable(admin)
      .insert({
        organization_id: parsed.data.organizationId,
        email,
        role: parsed.data.role,
        token_hash: hashSecretToken(generateSecretToken()), // placeholder, replaced by issueAndSend
        invited_by: guard.user.id,
        expires_at: invitationExpiry(),
      } as never)
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: error?.message ?? "insert_failed" };
    invitationId = (created as unknown as { id: string }).id;
  }

  return issueAndSend({
    id: invitationId,
    organizationId: parsed.data.organizationId,
    email,
    role: parsed.data.role,
    inviterId: guard.user.id,
    inviterEmail: guard.user.email,
  });
}

async function loadManagedInvitation(invitationId: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await invitationsTable(admin)
    .select("id, organization_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at")
    .eq("id", invitationId)
    .maybeSingle();
  const row = data as unknown as InvitationRow | null;
  if (!row || row.accepted_at) return null;
  const guard = await requireTeamManager(row.organization_id);
  if (!guard.ok || !canInviteRole(guard.role, row.role)) return null;
  return { row, guard };
}

export async function resendInvitation(invitationId: string): Promise<InviteResult> {
  const loaded = await loadManagedInvitation(invitationId);
  if (!loaded) return { ok: false, error: "forbidden" };
  return issueAndSend({
    id: loaded.row.id,
    organizationId: loaded.row.organization_id,
    email: loaded.row.email,
    role: loaded.row.role,
    inviterId: loaded.guard.user.id,
    inviterEmail: loaded.guard.user.email,
  });
}

export async function revokeInvitation(
  invitationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loaded = await loadManagedInvitation(invitationId);
  if (!loaded) return { ok: false, error: "forbidden" };
  const admin = createSupabaseAdminClient();
  const { error } = await invitationsTable(admin)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("id", invitationId)
    .is("accepted_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(TEAM_PATH);
  return { ok: true };
}

export type AcceptResult =
  | { ok: true; redirectTo: string }
  | { ok: false; code: "invalid" | "wrong_account" | "account_exists" | "invalid_input" | "failed" };

const signupSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
});

/**
 * Accepts an invitation. Signed in: the account e-mail must match the invitation.
 * Not signed in: creates the account (e-mail is verified by possession of the link) and signs in.
 */
export async function acceptInvitation(input: {
  token: string;
  fullName?: string;
  password?: string;
}): Promise<AcceptResult> {
  const preview = await getInvitationPreview(input.token);
  if (!preview || preview.state !== "pending") return { ok: false, code: "invalid" };
  if (!canInviteRole("owner", preview.role)) return { ok: false, code: "invalid" };

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

  // Claim first (atomic, single use), then grant access; release the claim if granting fails.
  const { data: claimed } = await invitationsTable(admin)
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId } as never)
    .eq("id", preview.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id");
  if (!claimed || (claimed as unknown[]).length === 0) return { ok: false, code: "invalid" };

  const { data: already } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", preview.organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!already) {
    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: preview.organizationId,
      user_id: userId,
      role: preview.role,
    });
    if (memberError) {
      await invitationsTable(admin)
        .update({ accepted_at: null, accepted_by: null } as never)
        .eq("id", preview.id);
      return { ok: false, code: "failed" };
    }
  }

  // Land in the invited organization.
  await admin.from("profiles").update({ active_organization_id: preview.organizationId }).eq("id", userId);

  if (signInPassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: preview.email,
      password: signInPassword,
    });
    if (signInError) return { ok: true, redirectTo: "/auth/login" };
  }

  revalidatePath(TEAM_PATH);
  return { ok: true, redirectTo: await resolvePostAuthRedirect(supabase, userId) };
}
