"use server";

import { isBillingEnabled, isStripeConfigured } from "@/lib/billing/constants";
import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";
import { SYNCABLE_STRIPE_SUBSCRIPTION_STATUSES } from "@/lib/billing/stripe-subscription-statuses";
import { syncSubscriptionFromStripe } from "@/lib/billing/sync-subscription-from-stripe";
import { getStripeClient } from "@/lib/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

const SYNCABLE_STATUSES = SYNCABLE_STRIPE_SUBSCRIPTION_STATUSES;

export async function syncSubscriptionAfterCheckout(
  organizationId: string,
): Promise<
  | { ok: true; status: string }
  | { ok: false; error: string }
> {
  if (!isBillingEnabled() || !isStripeConfigured()) {
    return { ok: false, error: "Fakturering er ikke aktivert." };
  }

  const ownerResult = await requireOrganizationOwner(organizationId);
  if (!ownerResult.ok) {
    return ownerResult;
  }

  const admin = createSupabaseAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_subscription_id, provider_customer_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const stripe = getStripeClient();
  let stripeSubscriptionId = subscription?.provider_subscription_id ?? null;

  if (!stripeSubscriptionId && subscription?.provider_customer_id) {
    const listed = await stripe.subscriptions.list({
      customer: subscription.provider_customer_id,
      status: "all",
      limit: 10,
    });

    const candidate = listed.data.find((sub) =>
      SYNCABLE_STATUSES.has(sub.status),
    );

    stripeSubscriptionId = candidate?.id ?? listed.data[0]?.id ?? null;
  }

  if (!stripeSubscriptionId) {
    return { ok: false, error: "Ingen Stripe-abonnement funnet ennå." };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    { expand: ["items.data.price.product"] },
  );

  const result = await syncSubscriptionFromStripe({
    organizationId,
    stripeSubscription,
    stripeCustomerId: subscription?.provider_customer_id,
  });

  if (!result.ok) {
    return result;
  }

  const { data: org } = await admin
    .from("organizations")
    .select("subscription_status")
    .eq("id", organizationId)
    .single();

  return { ok: true, status: org?.subscription_status ?? "active" };
}
