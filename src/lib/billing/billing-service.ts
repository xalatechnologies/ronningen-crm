import "server-only";

import type { BillingPlanId } from "@/config/billing-plans";
import type Stripe from "stripe";
import {
  assertBillingConfigured,
  getAppOrigin,
  getBillingMode,
  isBillingEnabled,
} from "@/lib/billing/billing-env";
import {
  DEFAULT_BILLING_PLAN_ID,
  getBillingPlan,
  resolvePlanStripePriceId,
} from "@/config/billing-plans";
import { requireOrganizationOwner } from "@/lib/billing/require-organization-owner";
import { getStripeClient } from "@/lib/billing/stripe";
import { STRIPE_PROVIDER } from "@/lib/billing/constants";
import { BLOCKING_STRIPE_SUBSCRIPTION_STATUSES } from "@/lib/billing/stripe-subscription-statuses";
import { syncSubscriptionFromStripe } from "@/lib/billing/sync-subscription-from-stripe";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";

const ACTIVE_STATUSES = BLOCKING_STRIPE_SUBSCRIPTION_STATUSES;

export async function createCheckoutSessionForOrganization(input: {
  organizationId: string;
  planId?: BillingPlanId;
  userId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isBillingEnabled()) {
    return { ok: false, error: "Fakturering er ikke aktivert." };
  }

  const billingCheck = assertBillingConfigured();
  if (!billingCheck.ok) {
    return { ok: false, error: billingCheck.error };
  }

  const planId = input.planId ?? DEFAULT_BILLING_PLAN_ID;
  const plan = getBillingPlan(planId);
  if (!plan) {
    return { ok: false, error: "Ugyldig abonnementsplan." };
  }

  const priceId = resolvePlanStripePriceId(planId);
  if (!priceId) {
    return { ok: false, error: "Stripe-pris mangler i miljøvariabler." };
  }

  const ownerResult = await requireOrganizationOwner(input.organizationId);
  if (!ownerResult.ok) {
    return ownerResult;
  }

  if (ownerResult.owner.userId !== input.userId) {
    return { ok: false, error: "Kun eier kan starte abonnement." };
  }

  const admin = createSupabaseAdminClient();
  const stripe = getStripeClient();
  const origin = getAppOrigin();
  const billingMode = getBillingMode();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name, billing_email, contact_email")
    .eq("id", input.organizationId)
    .single();

  if (orgError || !org) {
    return { ok: false, error: "Organisasjonen ble ikke funnet." };
  }

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_customer_id, provider_subscription_id, status")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (
    subscription?.provider_subscription_id &&
    ACTIVE_STATUSES.has(subscription.status)
  ) {
    return {
      ok: false,
      error:
        "Organisasjonen har allerede et aktivt abonnement. Bruk «Administrer abonnement».",
    };
  }

  let customerId = subscription?.provider_customer_id ?? null;
  const billingEmail =
    org.billing_email ?? org.contact_email ?? ownerResult.owner.email;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: billingEmail ?? undefined,
      name: org.name,
      metadata: { organization_id: input.organizationId },
    });
    customerId = customer.id;

    if (subscription) {
      await admin
        .from("subscriptions")
        .update({
          provider: STRIPE_PROVIDER,
          provider_customer_id: customerId,
        })
        .eq("organization_id", input.organizationId);
    } else {
      await admin.from("subscriptions").insert({
        organization_id: input.organizationId,
        provider: STRIPE_PROVIDER,
        provider_customer_id: customerId,
        plan: planId,
        status: "incomplete",
      });
    }

    if (billingEmail) {
      await admin
        .from("organizations")
        .update({ billing_email: billingEmail })
        .eq("id", input.organizationId);
    }
  }

  const blockingStripeSubscription = await findBlockingStripeSubscription(
    stripe,
    customerId,
  );
  if (blockingStripeSubscription) {
    await syncSubscriptionFromStripe({
      organizationId: input.organizationId,
      stripeSubscription: blockingStripeSubscription,
      stripeCustomerId: customerId,
    });
    return {
      ok: false,
      error:
        "Organisasjonen har allerede et aktivt abonnement. Bruk «Administrer abonnement».",
    };
  }

  const hadPriorStripeSubscription = Boolean(
    subscription?.provider_subscription_id,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: input.organizationId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(hadPriorStripeSubscription
        ? {}
        : { trial_period_days: plan.trialDays }),
      metadata: {
        organization_id: input.organizationId,
        plan_id: planId,
        billing_mode: billingMode,
      },
    },
    metadata: {
      organization_id: input.organizationId,
      user_id: input.userId,
      plan_id: planId,
      billing_mode: billingMode,
    },
    success_url: `${origin}/app/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app/settings/billing?checkout=canceled`,
    allow_promotion_codes: false,
  });

  if (!session.url) {
    return { ok: false, error: "Kunne ikke opprette betalingssesjon." };
  }

  return { ok: true, url: session.url };
}

async function findBlockingStripeSubscription(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  return (
    listed.data.find((sub) => ACTIVE_STATUSES.has(sub.status)) ?? null
  );
}

export async function createPortalSessionForOrganization(input: {
  organizationId: string;
  userId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isBillingEnabled()) {
    return { ok: false, error: "Fakturering er ikke aktivert." };
  }

  const billingCheck = assertBillingConfigured();
  if (!billingCheck.ok) {
    return { ok: false, error: billingCheck.error };
  }

  const ownerResult = await requireOrganizationOwner(input.organizationId);
  if (!ownerResult.ok) {
    return ownerResult;
  }

  if (ownerResult.owner.userId !== input.userId) {
    return { ok: false, error: "Kun eier kan administrere abonnement." };
  }

  const admin = createSupabaseAdminClient();
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!subscription?.provider_customer_id) {
    return {
      ok: false,
      error: "Ingen Stripe-kunde funnet. Start abonnement først.",
    };
  }

  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.provider_customer_id,
    return_url: `${getAppOrigin()}/app/settings/billing`,
  });

  return { ok: true, url: session.url };
}
