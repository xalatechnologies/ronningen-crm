import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type NotificationRecipient = {
  userId: string;
  email: string;
  fullName: string | null;
};

export async function listEligibleRecipients(): Promise<NotificationRecipient[]> {
  const admin = createSupabaseAdminClient();

  const [{ data: profiles, error: profilesError }, authUsers] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  if (profilesError) throw profilesError;

  const bannedById = new Map(
    (authUsers.data.users ?? []).map((user) => [
      user.id,
      Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
    ]),
  );

  const recipients: NotificationRecipient[] = [];
  const seenEmails = new Set<string>();

  for (const profile of profiles ?? []) {
    const email = profile.email?.trim();
    if (!email) continue;
    if (bannedById.get(profile.id)) continue;

    const normalized = email.toLowerCase();
    if (seenEmails.has(normalized)) continue;
    seenEmails.add(normalized);

    recipients.push({
      userId: profile.id,
      email,
      fullName: profile.full_name,
    });
  }

  return recipients;
}

export async function getRecipientByUserId(
  userId: string,
): Promise<NotificationRecipient | null> {
  const admin = createSupabaseAdminClient();

  const [{ data: profile, error }, authUser] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  if (error) throw error;
  if (!profile?.email?.trim()) return null;

  const bannedUntil = authUser.data.user?.banned_until;
  if (bannedUntil && new Date(bannedUntil) > new Date()) return null;

  return {
    userId: profile.id,
    email: profile.email.trim(),
    fullName: profile.full_name,
  };
}

export async function listOrganizationOwnerRecipients(
  organizationId: string,
): Promise<NotificationRecipient[]> {
  return listOrgMembersByRoles(organizationId, ["owner", "admin"]);
}

export async function listOrgMembersByRoles(
  organizationId: string,
  roles: ("owner" | "admin" | "member")[],
): Promise<NotificationRecipient[]> {
  const admin = createSupabaseAdminClient();

  const { data: members, error } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", roles);

  if (error) throw error;

  const recipients: NotificationRecipient[] = [];
  const seen = new Set<string>();

  for (const member of members ?? []) {
    if (seen.has(member.user_id)) continue;
    seen.add(member.user_id);
    const recipient = await getRecipientByUserId(member.user_id);
    if (recipient) recipients.push(recipient);
  }

  return recipients;
}
