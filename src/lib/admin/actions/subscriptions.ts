"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { updateSubscriptionPeriod } from "@/lib/admin/actions/billing";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { getServerT } from "@/lib/i18n/server-messages";
import {
  cancelStripeSubscription,
  getStripeCustomerUrl,
  retryStripeInvoicePayment,
} from "@/lib/admin/stripe-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";
import { isStripeConfigured } from "@/lib/billing/constants";
import { getStripeClient } from "@/lib/billing/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/sync-subscription-from-stripe";

function revalidateSubscriptionPaths(organizationId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/subscriptions");
  revalidatePath(adminRoutes.organizationDetail(organizationId));
  revalidatePath("/admin/organizations");
}

export async function extendOrganizationTrial(input: {
  organizationId: string;
  extraDays: number;
}) {
  if (input.extraDays < 1 || input.extraDays > 90) {
    return { ok: false as const, error: "Ugyldig antall dager (1–90)." };
  }

  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("current_period_end")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date();
  base.setDate(base.getDate() + input.extraDays);

  return updateSubscriptionPeriod({
    organizationId: input.organizationId,
    periodEnd: base.toISOString(),
  });
}

export async function retrySubscriptionPayment(organizationId: string) {
  const t = await getServerT();
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.provider_subscription_id) {
    return { ok: false as const, error: t("serverErrors.billing.noStripeSubscriptionShort") };
  }

  const result = await retryStripeInvoicePayment(sub.provider_subscription_id);
  if (!result.ok) return result;

  if (isStripeConfigured()) {
    const stripe = getStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(
      sub.provider_subscription_id,
    );
    await syncSubscriptionFromStripe({
      organizationId,
      stripeSubscription: stripeSub,
    });
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "subscription.payment_retried",
    targetType: "organization",
    targetId: organizationId,
    metadata: {},
  });

  revalidateSubscriptionPaths(organizationId);
  return { ok: true as const };
}

export async function cancelOrganizationSubscription(organizationId: string) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub?.provider_subscription_id) {
    const stripeResult = await cancelStripeSubscription(
      sub.provider_subscription_id,
    );
    if (!stripeResult.ok) return stripeResult;
  }

  await admin
    .from("organizations")
    .update({ subscription_status: "canceled" })
    .eq("id", organizationId);

  if (sub) {
    await admin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("organization_id", organizationId);
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "subscription.canceled",
    targetType: "organization",
    targetId: organizationId,
    metadata: {},
  });

  revalidateSubscriptionPaths(organizationId);
  return { ok: true as const };
}

export async function getStripeDashboardUrl(organizationId: string) {
  const t = await getServerT();
  await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.provider_customer_id) {
    return { ok: false as const, error: t("serverErrors.billing.noStripeCustomerShort") };
  }

  return {
    ok: true as const,
    url: getStripeCustomerUrl(sub.provider_customer_id),
  };
}
