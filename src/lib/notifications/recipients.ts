import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type NotificationRecipient = {
  userId: string;
  email: string;
  fullName: string | null;
};

async function loadBannedUserIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<Set<string>> {
  const banned = new Set<string>();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data.users ?? []) {
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      banned.add(user.id);
    }
  }
  return banned;
}

function profileToRecipient(
  profile: { id: string; email: string | null; full_name: string | null },
  bannedIds: Set<string>,
): NotificationRecipient | null {
  const email = profile.email?.trim();
  if (!email || bannedIds.has(profile.id)) return null;
  return {
    userId: profile.id,
    email,
    fullName: profile.full_name,
  };
}

export async function listEligibleRecipients(): Promise<NotificationRecipient[]> {
  const admin = createSupabaseAdminClient();

  const [{ data: profiles, error: profilesError }, bannedIds] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name")
        .not("email", "is", null),
      loadBannedUserIds(admin),
    ]);

  if (profilesError) throw profilesError;

  const recipients: NotificationRecipient[] = [];
  const seenEmails = new Set<string>();

  for (const profile of profiles ?? []) {
    const recipient = profileToRecipient(profile, bannedIds);
    if (!recipient) continue;

    const normalized = recipient.email.toLowerCase();
    if (seenEmails.has(normalized)) continue;
    seenEmails.add(normalized);
    recipients.push(recipient);
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

  const userIds = [
    ...new Set((members ?? []).map((member) => member.user_id)),
  ];
  if (userIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, bannedIds] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds)
        .not("email", "is", null),
      loadBannedUserIds(admin),
    ]);

  if (profilesError) throw profilesError;

  const recipients: NotificationRecipient[] = [];
  const seen = new Set<string>();

  for (const profile of profiles ?? []) {
    const recipient = profileToRecipient(profile, bannedIds);
    if (!recipient || seen.has(recipient.userId)) continue;
    seen.add(recipient.userId);
    recipients.push(recipient);
  }

  return recipients;
}
