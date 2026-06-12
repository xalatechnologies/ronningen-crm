"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";

function revalidateBillingPaths(organizationId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath(adminRoutes.organizationDetail(organizationId));
  revalidatePath("/admin/organizations");
}

export async function updateSubscriptionPeriod(input: {
  organizationId: string;
  periodEnd: string | null;
  periodStart?: string | null;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, current_period_start, current_period_end")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const updatePayload = {
    current_period_end: input.periodEnd,
    ...(input.periodStart !== undefined
      ? { current_period_start: input.periodStart }
      : {}),
  };

  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update(updatePayload)
      .eq("id", existing.id);

    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data: org } = await admin
      .from("organizations")
      .select("subscription_status, subscription_plan")
      .eq("id", input.organizationId)
      .single();

    if (!org) return { ok: false as const, error: "Organisasjonen finnes ikke." };

    const { error } = await admin.from("subscriptions").insert({
      organization_id: input.organizationId,
      status: org.subscription_status,
      plan: org.subscription_plan,
      current_period_start: input.periodStart ?? null,
      current_period_end: input.periodEnd,
    });

    if (error) return { ok: false as const, error: error.message };
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.subscription_period_updated",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { before: existing ?? null, after: updatePayload },
  });

  revalidateBillingPaths(input.organizationId);
  return { ok: true as const };
}

export async function syncSubscriptionFromOrganization(organizationId: string) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("subscription_status, subscription_plan")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    return { ok: false as const, error: "Organisasjonen finnes ikke." };
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: org.subscription_status, plan: org.subscription_plan })
      .eq("id", existing.id);

    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from("subscriptions").insert({
      organization_id: organizationId,
      status: org.subscription_status,
      plan: org.subscription_plan,
    });

    if (error) return { ok: false as const, error: error.message };
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.subscription_synced",
    targetType: "organization",
    targetId: organizationId,
    metadata: { status: org.subscription_status, plan: org.subscription_plan },
  });

  revalidateBillingPaths(organizationId);
  return { ok: true as const };
}
