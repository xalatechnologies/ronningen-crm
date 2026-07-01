"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { isBillingEnabled, isStripeConfigured } from "@/lib/billing/constants";
import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";
import { SYNCABLE_STRIPE_SUBSCRIPTION_STATUSES } from "@/lib/billing/stripe-subscription-statuses";
import { syncSubscriptionFromStripe } from "@/lib/billing/sync-subscription-from-stripe";
import { getStripeClient } from "@/lib/billing/stripe";
import { getServerT } from "@/lib/i18n/server-messages";
import type Stripe from "stripe";

const SYNCABLE_STATUSES = SYNCABLE_STRIPE_SUBSCRIPTION_STATUSES;
const MAX_SYNC_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveSubscriptionFromCheckoutSession(
  stripe: ReturnType<typeof getStripeClient>,
  checkoutSessionId: string,
  organizationId: string,
): Promise<Stripe.Subscription | null> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  const sessionOrgId =
    session.metadata?.organization_id ?? session.client_reference_id ?? null;

  if (sessionOrgId && sessionOrgId !== organizationId) {
    return null;
  }

  const subscription = session.subscription;
  if (!subscription) return null;

  if (typeof subscription === "string") {
    return stripe.subscriptions.retrieve(subscription, {
      expand: ["items.data.price.product"],
    });
  }

  return subscription;
}

async function resolveStripeSubscriptionId(input: {
  stripe: ReturnType<typeof getStripeClient>;
  organizationId: string;
  checkoutSessionId?: string | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
}): Promise<Stripe.Subscription | null> {
  const {
    stripe,
    organizationId,
    checkoutSessionId,
    providerSubscriptionId,
    providerCustomerId,
  } = input;

  if (checkoutSessionId) {
    const fromSession = await resolveSubscriptionFromCheckoutSession(
      stripe,
      checkoutSessionId,
      organizationId,
    );
    if (fromSession) return fromSession;
  }

  let stripeSubscriptionId = providerSubscriptionId;

  if (!stripeSubscriptionId && providerCustomerId) {
    const listed = await stripe.subscriptions.list({
      customer: providerCustomerId,
      status: "all",
      limit: 10,
    });

    const candidate = listed.data.find((sub) =>
      SYNCABLE_STATUSES.has(sub.status),
    );

    stripeSubscriptionId = candidate?.id ?? listed.data[0]?.id ?? null;
  }

  if (!stripeSubscriptionId) {
    return null;
  }

  return stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["items.data.price.product"],
  });
}

export async function syncSubscriptionAfterCheckout(
  organizationId: string,
  checkoutSessionId?: string | null,
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
  const stripe = getStripeClient();

  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("provider_subscription_id, provider_customer_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const stripeSubscription = await resolveStripeSubscriptionId({
      stripe,
      organizationId,
      checkoutSessionId,
      providerSubscriptionId: subscription?.provider_subscription_id ?? null,
      providerCustomerId: subscription?.provider_customer_id ?? null,
    });

    if (stripeSubscription) {
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

      revalidatePath("/app/settings/billing");
      revalidatePath("/app", "layout");

      return { ok: true, status: org?.subscription_status ?? "active" };
    }

    if (attempt < MAX_SYNC_ATTEMPTS) {
      await sleep(400 * attempt);
    }
  }

  const t = await getServerT();
  return { ok: false, error: t("serverErrors.billing.noStripeSubscription") };
}
