import type { SupabaseClient } from "@supabase/supabase-js";

import { logAdminAction } from "@/lib/admin/audit-log";
import type { Database } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;

export type OrganizationMemberCleanupResult = {
  clearedActiveOrganizationIds: string[];
  deletedUserIds: string[];
  skippedPlatformAdminIds: string[];
  errors: Array<{ userId: string; error: string }>;
};

export function shouldDeleteAuthUserAfterOrgDelete(input: {
  isPlatformAdmin: boolean;
  remainingMembershipCount: number;
}): boolean {
  if (input.isPlatformAdmin) return false;
  return input.remainingMembershipCount === 0;
}

export async function cleanupOrganizationMembersAfterDelete(
  admin: AdminClient,
  input: {
    organizationId: string;
    memberUserIds: string[];
    actorUserId: string;
  },
): Promise<OrganizationMemberCleanupResult> {
  const result: OrganizationMemberCleanupResult = {
    clearedActiveOrganizationIds: [],
    deletedUserIds: [],
    skippedPlatformAdminIds: [],
    errors: [],
  };

  const uniqueMemberIds = [...new Set(input.memberUserIds)];
  if (uniqueMemberIds.length === 0) {
    return result;
  }

  for (const userId of uniqueMemberIds) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("active_organization_id, is_platform_admin")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      result.errors.push({ userId, error: profileError.message });
      continue;
    }

    if (profile?.active_organization_id === input.organizationId) {
      const { error: clearError } = await admin
        .from("profiles")
        .update({ active_organization_id: null })
        .eq("id", userId);

      if (clearError) {
        result.errors.push({ userId, error: clearError.message });
      } else {
        result.clearedActiveOrganizationIds.push(userId);
      }
    }

    if (profile?.is_platform_admin) {
      result.skippedPlatformAdminIds.push(userId);
      continue;
    }

    const { count, error: membershipError } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (membershipError) {
      result.errors.push({ userId, error: membershipError.message });
      continue;
    }

    if (
      !shouldDeleteAuthUserAfterOrgDelete({
        isPlatformAdmin: false,
        remainingMembershipCount: count ?? 0,
      })
    ) {
      continue;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      result.errors.push({ userId, error: deleteError.message });
      continue;
    }

    result.deletedUserIds.push(userId);

    await logAdminAction({
      actorUserId: input.actorUserId,
      action: "user.deleted_after_org_delete",
      targetType: "user",
      targetId: userId,
      metadata: { organizationId: input.organizationId },
    });
  }

  return result;
}
