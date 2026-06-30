"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { cleanupOrganizationMembersAfterDelete } from "@/lib/admin/delete-organization-members";
import { purgeOrganizationTenantData } from "@/lib/admin/delete-organization-cascade";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";
import { notifyBillingAccessSuspended } from "@/lib/notifications/actions/org-events";

function revalidateOrganizationPaths(organizationId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(adminRoutes.organizationDetail(organizationId));
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/users");
}

export async function suspendOrganization(input: {
  organizationId: string;
  reason?: string | null;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("organizations")
    .select("is_suspended, suspended_at, suspended_reason")
    .eq("id", input.organizationId)
    .single();

  const { error } = await admin
    .from("organizations")
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_reason: input.reason?.trim() || null,
    })
    .eq("id", input.organizationId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.suspended",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { before, reason: input.reason ?? null },
  });

  try {
    await notifyBillingAccessSuspended({
      organizationId: input.organizationId,
      reason: input.reason,
    });
  } catch (error) {
    console.warn("[notifications] Kunne ikke varsle om suspensjon.", error);
  }

  revalidateOrganizationPaths(input.organizationId);
  return { ok: true as const };
}

export async function unsuspendOrganization(organizationId: string) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("organizations")
    .select("is_suspended, suspended_at, suspended_reason")
    .eq("id", organizationId)
    .single();

  const { error } = await admin
    .from("organizations")
    .update({
      is_suspended: false,
      suspended_at: null,
      suspended_reason: null,
    })
    .eq("id", organizationId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.unsuspended",
    targetType: "organization",
    targetId: organizationId,
    metadata: { before },
  });

  revalidateOrganizationPaths(organizationId);
  return { ok: true as const };
}

export async function updateOrganizationAdminNotes(input: {
  organizationId: string;
  adminNotes: string;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("organizations")
    .select("admin_notes")
    .eq("id", input.organizationId)
    .single();

  const { error } = await admin
    .from("organizations")
    .update({ admin_notes: input.adminNotes.trim() || null })
    .eq("id", input.organizationId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.notes_updated",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { before, after: input.adminNotes.trim() || null },
  });

  revalidateOrganizationPaths(input.organizationId);
  return { ok: true as const };
}

export async function deleteOrganization(input: {
  organizationId: string;
  confirmSlug: string;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: org, error: fetchError } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", input.organizationId)
    .single();

  if (fetchError || !org) {
    return { ok: false as const, error: "Organisasjonen finnes ikke." };
  }

  if (org.slug !== input.confirmSlug.trim()) {
    return { ok: false as const, error: "Slug stemmer ikke. Skriv inn riktig slug." };
  }

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId);

  const memberIds = (members ?? []).map((m) => m.user_id);

  if (memberIds.length > 0) {
    const { data: platformAdmins } = await admin
      .from("profiles")
      .select("id")
      .in("id", memberIds)
      .eq("is_platform_admin", true);

    for (const adminProfile of platformAdmins ?? []) {
      const { count } = await admin
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", adminProfile.id);

      if ((count ?? 0) <= 1) {
        return {
          ok: false as const,
          error:
            "Kan ikke slette organisasjonen: en plattformadmin har ingen andre organisasjoner.",
        };
      }
    }
  }

  const purgeResult = await purgeOrganizationTenantData(admin, input.organizationId);
  if (!purgeResult.ok) {
    return { ok: false as const, error: purgeResult.error };
  }

  const { error } = await admin
    .from("organizations")
    .delete()
    .eq("id", input.organizationId);

  if (error) {
    return {
      ok: false as const,
      error:
        error.message.includes("foreign key")
          ? "Kunne ikke slette organisasjonen på grunn av gjenværende data. Kontakt utvikler."
          : error.message,
    };
  }

  const memberCleanup = await cleanupOrganizationMembersAfterDelete(admin, {
    organizationId: input.organizationId,
    memberUserIds: memberIds,
    actorUserId: adminUser.userId,
  });

  if (memberCleanup.errors.length > 0) {
    console.error(
      "[admin/deleteOrganization] Member cleanup errors",
      memberCleanup.errors,
    );
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.deleted",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: {
      deleted: org,
      deletedAuthUserIds: memberCleanup.deletedUserIds,
      skippedPlatformAdminIds: memberCleanup.skippedPlatformAdminIds,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/users");

  return { ok: true as const };
}
