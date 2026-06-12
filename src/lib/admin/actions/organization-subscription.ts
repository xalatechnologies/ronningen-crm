"use server";

import { revalidatePath } from "next/cache";

import type {
  AdminSettableSubscriptionStatus,
  SubscriptionPlan,
} from "@/constants/roles";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

export type UpdateOrganizationSubscriptionInput = {
  organizationId: string;
  subscriptionStatus: AdminSettableSubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
};

export async function updateOrganizationSubscription(
  input: UpdateOrganizationSubscriptionInput,
) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: before } = await admin
    .from("organizations")
    .select("subscription_status, subscription_plan")
    .eq("id", input.organizationId)
    .single();

  const { error } = await admin
    .from("organizations")
    .update({
      subscription_status: input.subscriptionStatus,
      subscription_plan: input.subscriptionPlan,
    })
    .eq("id", input.organizationId);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  await admin
    .from("subscriptions")
    .update({
      status: input.subscriptionStatus,
      plan: input.subscriptionPlan,
    })
    .eq("organization_id", input.organizationId);

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.subscription_updated",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: {
      before: before ?? null,
      after: {
        subscription_status: input.subscriptionStatus,
        subscription_plan: input.subscriptionPlan,
      },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${input.organizationId}`);
  revalidatePath("/admin/subscriptions");

  return { ok: true as const };
}
