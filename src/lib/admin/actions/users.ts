"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerTranslation } from "@/i18n/server";
import { adminRoutes } from "@/config/admin-routes";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { isUserRole } from "@/lib/validations";

function revalidateUserPaths(userId: string, organizationId?: string) {
  revalidatePath("/admin/users");
  revalidatePath(adminRoutes.userDetail(userId));
  revalidatePath("/admin/organizations");
  if (organizationId) {
    revalidatePath(adminRoutes.organizationDetail(organizationId));
  }
}

export async function setPlatformAdmin(input: {
  userId: string;
  isPlatformAdmin: boolean;
}) {
  const adminUser = await requirePlatformAdmin();

  if (input.userId === adminUser.userId && !input.isPlatformAdmin) {
    return {
      ok: false as const,
      error: "Du kan ikke fjerne din egen plattformadmin-tilgang.",
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("profiles")
    .select("is_platform_admin, email")
    .eq("id", input.userId)
    .single();

  const { error } = await admin
    .from("profiles")
    .update({ is_platform_admin: input.isPlatformAdmin })
    .eq("id", input.userId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: input.isPlatformAdmin
      ? "user.platform_admin_granted"
      : "user.platform_admin_revoked",
    targetType: "user",
    targetId: input.userId,
    metadata: { before, after: input.isPlatformAdmin },
  });

  revalidateUserPaths(input.userId);
  return { ok: true as const };
}

export async function removeOrganizationMember(input: {
  organizationId: string;
  userId: string;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: member } = await admin
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!member) {
    return { ok: false as const, error: "Medlemmet finnes ikke." };
  }

  if (member.role === "owner") {
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", input.organizationId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return {
        ok: false as const,
        error: t("serverErrors.admin.cannotRemoveLastOwner"),
      };
    }
  }

  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.member_removed",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { userId: input.userId, role: member.role },
  });

  revalidateUserPaths(input.userId, input.organizationId);
  return { ok: true as const };
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: UserRole;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();

  if (!isUserRole(input.role) || !USER_ROLES.includes(input.role)) {
    return { ok: false as const, error: "Ugyldig rolle." };
  }

  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .single();

  if (before?.role === "owner" && input.role !== "owner") {
    const { count } = await admin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", input.organizationId)
      .eq("role", "owner");

    if ((count ?? 0) <= 1) {
      return {
        ok: false as const,
        error: t("serverErrors.admin.cannotChangeLastOwnerRole"),
      };
    }
  }

  const { error } = await admin
    .from("organization_members")
    .update({ role: input.role })
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.member_role_updated",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { userId: input.userId, before, after: input.role },
  });

  revalidateUserPaths(input.userId, input.organizationId);
  return { ok: true as const };
}

export async function transferOrganizationOwnership(input: {
  organizationId: string;
  newOwnerUserId: string;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: newOwnerMember } = await admin
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.newOwnerUserId)
    .maybeSingle();

  if (!newOwnerMember) {
    return {
      ok: false as const,
      error: t("serverErrors.admin.newOwnerMustBeMember"),
    };
  }

  const { data: currentOwners } = await admin
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", input.organizationId)
    .eq("role", "owner");

  const { error: promoteError } = await admin
    .from("organization_members")
    .update({ role: "owner" })
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.newOwnerUserId);

  if (promoteError) return { ok: false as const, error: promoteError.message };

  for (const owner of currentOwners ?? []) {
    if (owner.user_id === input.newOwnerUserId) continue;
    await admin
      .from("organization_members")
      .update({ role: "admin" })
      .eq("organization_id", input.organizationId)
      .eq("user_id", owner.user_id);
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.ownership_transferred",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: {
      newOwnerUserId: input.newOwnerUserId,
      previousOwners: (currentOwners ?? []).map((o) => o.user_id),
    },
  });

  revalidateUserPaths(input.newOwnerUserId, input.organizationId);
  for (const owner of currentOwners ?? []) {
    revalidateUserPaths(owner.user_id, input.organizationId);
  }

  return { ok: true as const };
}
