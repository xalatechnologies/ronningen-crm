import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Json } from "@/types/database.types";
import { getBillingMode, isStripeLivemodeExpected } from "@/lib/billing/billing-env";
import {
  markOrganizationCanceled,
  markOrganizationPastDue,
  syncSubscriptionFromStripe,
} from "@/lib/billing/sync-subscription-from-stripe";
import { resolveInvoiceSubscriptionId } from "@/lib/billing/stripe-subscription-period";
import { getStripeClientForWebhook } from "@/lib/billing/stripe";
import { sendPaymentFailedNotifications } from "@/lib/notifications/send-platform-notification";

function resolveOrganizationIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  clientReferenceId?: string | null,
): string | null {
  return metadata?.organization_id ?? clientReferenceId ?? null;
}

function resolveStripeCustomerId(
  customer: Stripe.Subscription["customer"] | Stripe.Customer | string | null,
): string | null {
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

async function resolveOrganizationIdForWebhook(input: {
  metadata?: Stripe.Metadata | null;
  clientReferenceId?: string | null;
  stripeCustomerId?: string | null;
}): Promise<string | null> {
  const fromMetadata = resolveOrganizationIdFromMetadata(
    input.metadata,
    input.clientReferenceId,
  );
  if (fromMetadata) return fromMetadata;

  if (!input.stripeCustomerId) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("organization_id")
    .eq("provider_customer_id", input.stripeCustomerId)
    .maybeSingle();

  return data?.organization_id ?? null;
}

function sanitizeWebhookPayload(event: Stripe.Event): Json {
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    object_id:
      event.data.object && typeof event.data.object === "object"
        ? "id" in event.data.object
          ? (event.data.object as { id?: string }).id ?? null
          : null
        : null,
  };
}

type WebhookClaimResult =
  | { action: "process" }
  | { action: "skip"; reason: "already_processed" };

async function claimWebhookEvent(
  eventId: string,
  eventType: string,
  payload: Json,
): Promise<WebhookClaimResult> {
  const admin = createSupabaseAdminClient();

  const { data: inserted, error } = await admin
    .from("stripe_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload,
      processed_at: null,
    })
    .select("event_id")
    .maybeSingle();

  if (!error && inserted) {
    return { action: "process" };
  }

  if (error?.code === "23505") {
    const { data: existing } = await admin
      .from("stripe_webhook_events")
      .select("processed_at")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing?.processed_at) {
      return { action: "skip", reason: "already_processed" };
    }

    return { action: "process" };
  }

  throw new Error(error?.message ?? "Kunne ikke reservere webhook-hendelse.");
}

async function markWebhookEventProcessed(eventId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

function webhookLivemodeMismatch(event: Stripe.Event): boolean {
  return event.livemode !== isStripeLivemodeExpected();
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  organizationId: string,
) {
  const customerId = resolveStripeCustomerId(subscription.customer);

  const result = await syncSubscriptionFromStripe({
    organizationId,
    stripeSubscription: subscription,
    stripeCustomerId: customerId,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

async function processStripeEvent(
  stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = await resolveOrganizationIdForWebhook({
        metadata: session.metadata,
        clientReferenceId: session.client_reference_id,
        stripeCustomerId: resolveStripeCustomerId(session.customer),
      });
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (organizationId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
          { expand: ["items.data.price.product"] },
        );
        await handleSubscriptionEvent(subscription, organizationId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = await resolveOrganizationIdForWebhook({
        metadata: subscription.metadata,
        stripeCustomerId: resolveStripeCustomerId(subscription.customer),
      });
      if (organizationId) {
        await handleSubscriptionEvent(subscription, organizationId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = await resolveOrganizationIdForWebhook({
        metadata: subscription.metadata,
        stripeCustomerId: resolveStripeCustomerId(subscription.customer),
      });
      if (organizationId) {
        await markOrganizationCanceled(organizationId);
      }
      break;
    }
    case "invoice.payment_failed":
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = resolveInvoiceSubscriptionId(invoice);

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
          { expand: ["items.data.price.product"] },
        );
        const organizationId = await resolveOrganizationIdForWebhook({
          metadata: subscription.metadata,
          stripeCustomerId: resolveStripeCustomerId(subscription.customer),
        });
        if (organizationId) {
          if (event.type === "invoice.payment_failed") {
            await markOrganizationPastDue(organizationId, subscription);
            const admin = createSupabaseAdminClient();
            const { data: org } = await admin
              .from("organizations")
              .select("name")
              .eq("id", organizationId)
              .maybeSingle();
            try {
              await sendPaymentFailedNotifications({
                organizationId,
                organizationName: org?.name ?? "Organisasjonen din",
                invoiceId: invoice.id,
              });
            } catch (notifyError) {
              console.error(
                "[stripe/webhook] payment_failed notification",
                notifyError,
              );
            }
          } else {
            await handleSubscriptionEvent(subscription, organizationId);
          }
        }
      }
      break;
    }
    case "customer.subscription.trial_will_end":
      break;
    default:
      break;
  }
}

export async function handleStripeWebhookRequest(
  request: Request,
): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET mangler." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Mangler signatur." }, { status: 400 });
  }

  const stripe = getStripeClientForWebhook();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ugyldig webhook-signatur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (webhookLivemodeMismatch(event)) {
    console.warn(
      "[stripe/webhook] livemode mismatch",
      {
        eventLivemode: event.livemode,
        billingMode: getBillingMode(),
        eventId: event.id,
        eventType: event.type,
      },
    );
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "livemode_mismatch",
    });
  }

  const payload = sanitizeWebhookPayload(event);

  try {
    const claim = await claimWebhookEvent(event.id, event.type, payload);
    if (claim.action === "skip") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await processStripeEvent(stripe, event);
    await markWebhookEventProcessed(event.id);

    revalidatePath("/app/settings/billing");
    revalidatePath("/admin/subscriptions");

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook-behandling feilet.";
    console.error("[stripe/webhook]", message, { eventId: event.id });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
