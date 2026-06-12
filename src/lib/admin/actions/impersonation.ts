"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import {
  clearImpersonationCookieOptions,
  impersonationCookieOptions,
} from "@/lib/admin/impersonation";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";

export async function startImpersonation(input: {
  organizationId: string;
  reason: string;
}) {
  const adminUser = await requirePlatformAdmin();
  const reason = input.reason.trim();

  if (reason.length < 5) {
    return { ok: false as const, error: "Begrunnelse må være minst 5 tegn." };
  }

  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (!org) {
    return { ok: false as const, error: "Organisasjonen finnes ikke." };
  }

  await admin.from("platform_impersonation_sessions").insert({
    admin_user_id: adminUser.userId,
    organization_id: input.organizationId,
    reason,
  });

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "impersonation.started",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { reason },
  });

  const cookieStore = await cookies();
  cookieStore.set(impersonationCookieOptions(input.organizationId));

  revalidatePath("/app");
  revalidatePath(adminRoutes.organizationDetail(input.organizationId));

  return { ok: true as const, organizationName: org.name };
}

export async function endImpersonation() {
  const adminUser = await requirePlatformAdmin();
  const cookieStore = await cookies();
  const orgId = cookieStore.get("platform_impersonation_org_id")?.value ?? null;

  if (orgId) {
    const admin = createSupabaseAdminClient();
    await admin
      .from("platform_impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", adminUser.userId)
      .eq("organization_id", orgId)
      .is("ended_at", null);

    await logAdminAction({
      actorUserId: adminUser.userId,
      action: "impersonation.ended",
      targetType: "organization",
      targetId: orgId,
      metadata: {},
    });
  }

  cookieStore.set(clearImpersonationCookieOptions());
  revalidatePath("/app");

  return { ok: true as const };
}
