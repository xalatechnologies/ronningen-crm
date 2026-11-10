"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { cancelStripeSubscription } from "@/lib/admin/stripe-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";
import { getServerT } from "@/lib/i18n/server-messages";

function revalidateBillingExemptPaths(organizationId: string) {
  revalidatePath("/app/settings/billing");
  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath(adminRoutes.organizationDetail(organizationId));
  revalidatePath("/admin/organizations");
}

export async function setOrganizationBillingExempt(input: {
  organizationId: string;
  exempt: boolean;
}) {
  const t = await getServerT();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, billing_exempt")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return { ok: false as const, error: t("serverErrors.admin.orgNotFound") };
  }

  if (org.billing_exempt === input.exempt) {
    return { ok: true as const };
  }

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (input.exempt && subscription?.provider_subscription_id) {
    const stripeResult = await cancelStripeSubscription(
      subscription.provider_subscription_id,
    );
    if (!stripeResult.ok) {
      return stripeResult;
    }
  }

  const { error: updateError } = await admin
    .from("organizations")
    .update({
      billing_exempt: input.exempt,
      ...(input.exempt
        ? {
            subscription_status: "active",
            trial_ends_at: null,
          }
        : {}),
    })
    .eq("id", input.organizationId);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  if (input.exempt) {
    await admin
      .from("subscriptions")
      .update({
        status: "active",
        last_synced_at: new Date().toISOString(),
      })
      .eq("organization_id", input.organizationId);
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: input.exempt
      ? "organization.billing_exempted"
      : "organization.billing_exemption_removed",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: {
      hadStripeSubscription: Boolean(subscription?.provider_subscription_id),
    },
  });

  revalidateBillingExemptPaths(input.organizationId);
  return { ok: true as const };
}

export async function cancelStripeForBillingExemptOrganization(
  organizationId: string,
) {
  const t = await getServerT();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, billing_exempt")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return { ok: false as const, error: t("serverErrors.admin.orgNotFound") };
  }

  if (!org.billing_exempt) {
    return {
      ok: false as const,
      error: t("serverErrors.billing.billingExemptRequired"),
    };
  }

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!subscription?.provider_subscription_id) {
    return { ok: true as const };
  }

  const stripeResult = await cancelStripeSubscription(
    subscription.provider_subscription_id,
  );
  if (!stripeResult.ok) {
    return stripeResult;
  }

  await admin
    .from("organizations")
    .update({
      subscription_status: "active",
      trial_ends_at: null,
    })
    .eq("id", organizationId);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      last_synced_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "organization.billing_exempt_stripe_canceled",
    targetType: "organization",
    targetId: organizationId,
    metadata: {},
  });

  revalidateBillingExemptPaths(organizationId);
  return { ok: true as const };
}
