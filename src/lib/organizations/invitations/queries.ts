import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { hashSecretToken, isSecretTokenShape } from "@/lib/contracts/crypto";
import { invitationState, type InvitationRow, type InvitationState } from "./rules";

/** The table is new and not yet in the generated types. */
export function invitationsTable(client: ReturnType<typeof createSupabaseAdminClient>) {
  return client.from("organization_invitations" as never);
}

export type InvitationPreview = {
  id: string;
  organizationId: string;
  organizationName: string;
  inviterName: string | null;
  email: string;
  role: string;
  state: InvitationState;
};

/** Looks an invitation up by its raw token (only the hash is stored). Null for unknown tokens. */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  if (!isSecretTokenShape(token)) return null;
  const admin = createSupabaseAdminClient();

  const { data } = await invitationsTable(admin)
    .select("id, organization_id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashSecretToken(token))
    .maybeSingle();
  const row = data as unknown as InvitationRow | null;
  if (!row) return null;

  const [{ data: org }, { data: inviter }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", row.organization_id).maybeSingle(),
    row.invited_by
      ? admin.from("profiles").select("full_name, email").eq("id", row.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: org?.name ?? "",
    inviterName: inviter?.full_name?.trim() || inviter?.email || null,
    email: row.email,
    role: row.role,
    state: invitationState(row),
  };
}

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

/** Open invitations for the Team page (service role; caller has already verified owner/admin). */
export async function listPendingInvitations(organizationId: string): Promise<PendingInvitation[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await invitationsTable(admin)
    .select("id, email, role, expires_at, accepted_at, revoked_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return ((data as unknown as InvitationRow[] | null) ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
  }));
}
