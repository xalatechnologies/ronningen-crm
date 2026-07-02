import type Stripe from "stripe";

import { DEFAULT_BILLING_PLAN_ID } from "@/config/billing-plans";
import { STRIPE_PROVIDER } from "@/lib/billing/constants";
import { mapStripeSubscriptionStatus } from "@/lib/billing/map-stripe-status";
import { getStripeSubscriptionPeriod } from "@/lib/billing/stripe-subscription-period";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Json } from "@/types/database.types";

function toIso(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds == null) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function resolvePriceAndProduct(stripeSubscription: Stripe.Subscription): {
  priceId: string | null;
  productId: string | null;
} {
  const item = stripeSubscription.items.data[0];
  const price = item?.price;
  const priceId = price?.id ?? null;
  const product = price?.product;
  const productId =
    typeof product === "string" ? product : product?.id ?? null;
  return { priceId, productId };
}

function buildMetadataSnapshot(stripeSubscription: Stripe.Subscription) {
  return {
    stripe_status: stripeSubscription.status,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    billing_mode: stripeSubscription.metadata?.billing_mode ?? null,
    plan_id: stripeSubscription.metadata?.plan_id ?? DEFAULT_BILLING_PLAN_ID,
  };
}

export async function syncSubscriptionFromStripe(input: {
  organizationId: string;
  stripeSubscription: Stripe.Subscription;
  stripeCustomerId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();

  const { data: orgRow } = await admin
    .from("organizations")
    .select("billing_exempt")
    .eq("id", input.organizationId)
    .maybeSingle();

  const billingExempt = orgRow?.billing_exempt ?? false;
  const status = mapStripeSubscriptionStatus(input.stripeSubscription.status);
  const customerId =
    typeof input.stripeSubscription.customer === "string"
      ? input.stripeSubscription.customer
      : input.stripeSubscription.customer?.id ??
        input.stripeCustomerId ??
        null;

  const { periodStart, periodEnd } = getStripeSubscriptionPeriod(
    input.stripeSubscription,
  );
  const periodStartIso = toIso(periodStart);
  const periodEndIso = toIso(periodEnd);
  const { priceId, productId } = resolvePriceAndProduct(
    input.stripeSubscription,
  );

  const planId =
    input.stripeSubscription.metadata?.plan_id ?? DEFAULT_BILLING_PLAN_ID;

  const nowIso = new Date().toISOString();

  const subscriptionPayload = {
    provider: STRIPE_PROVIDER,
    provider_customer_id: customerId,
    provider_subscription_id: input.stripeSubscription.id,
    provider_price_id: priceId,
    provider_product_id: productId,
    plan: planId,
    status: billingExempt ? "active" : status,
    current_period_start: periodStartIso,
    current_period_end: periodEndIso,
    cancel_at_period_end: input.stripeSubscription.cancel_at_period_end,
    canceled_at: toIso(input.stripeSubscription.canceled_at),
    metadata: buildMetadataSnapshot(input.stripeSubscription) as Json,
    last_synced_at: nowIso,
  };

  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (existingSub) {
    const { error } = await admin
      .from("subscriptions")
      .update(subscriptionPayload)
      .eq("id", existingSub.id);

    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("subscriptions").insert({
      organization_id: input.organizationId,
      ...subscriptionPayload,
    });

    if (error) return { ok: false, error: error.message };
  }

  const orgUpdate: {
    subscription_status: string;
    subscription_plan: string;
    trial_ends_at: string | null;
  } = {
    subscription_status: billingExempt ? "active" : status,
    subscription_plan: planId,
    trial_ends_at: billingExempt
      ? null
      : status === "trialing" && periodEndIso
        ? periodEndIso
        : null,
  };

  const { error: orgError } = await admin
    .from("organizations")
    .update(orgUpdate)
    .eq("id", input.organizationId);

  if (orgError) return { ok: false, error: orgError.message };

  return { ok: true };
}

export async function markOrganizationPastDue(
  organizationId: string,
  stripeSubscription?: Stripe.Subscription,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("billing_exempt")
    .eq("id", organizationId)
    .maybeSingle();

  if (org?.billing_exempt) {
    return;
  }

  if (stripeSubscription) {
    await syncSubscriptionFromStripe({
      organizationId,
      stripeSubscription,
    });
    return;
  }

  await admin
    .from("organizations")
    .update({ subscription_status: "past_due", trial_ends_at: null })
    .eq("id", organizationId);

  await admin
    .from("subscriptions")
    .update({ status: "past_due", last_synced_at: new Date().toISOString() })
    .eq("organization_id", organizationId);
}

export async function markOrganizationCanceled(
  organizationId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("billing_exempt")
    .eq("id", organizationId)
    .maybeSingle();

  if (org?.billing_exempt) {
    return;
  }

  const nowIso = new Date().toISOString();

  await admin
    .from("organizations")
    .update({
      subscription_status: "canceled",
      trial_ends_at: null,
    })
    .eq("id", organizationId);

  await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: nowIso,
      last_synced_at: nowIso,
    })
    .eq("organization_id", organizationId);
}
