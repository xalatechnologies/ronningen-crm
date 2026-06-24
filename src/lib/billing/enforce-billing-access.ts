import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { isStripeConfigured } from "@/lib/billing/constants";
import { getStripeClient } from "@/lib/billing/stripe";
import {
  markOrganizationCanceled,
  syncSubscriptionFromStripe,
} from "@/lib/billing/sync-subscription-from-stripe";

export type BillingEnforcementResult = {
  expiredLocalTrials: number;
  stripeResynced: number;
  pastDueResynced: number;
  errors: string[];
};

export async function enforceBillingAccess(): Promise<BillingEnforcementResult> {
  const admin = createSupabaseAdminClient();
  const result: BillingEnforcementResult = {
    expiredLocalTrials: 0,
    stripeResynced: 0,
    pastDueResynced: 0,
    errors: [],
  };

  const now = new Date().toISOString();

  const { data: expiredTrials, error: expiredError } = await admin
    .from("subscriptions")
    .select(
      "organization_id, provider_subscription_id, provider_customer_id, status, current_period_end",
    )
    .eq("status", "trialing")
    .lt("current_period_end", now);

  if (expiredError) {
    result.errors.push(expiredError.message);
    return result;
  }

  const stripe = isStripeConfigured() ? getStripeClient() : null;

  for (const row of expiredTrials ?? []) {
    if (row.provider_subscription_id && stripe) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          row.provider_subscription_id,
          { expand: ["items.data"] },
        );
        const syncResult = await syncSubscriptionFromStripe({
          organizationId: row.organization_id,
          stripeSubscription,
        });
        if (syncResult.ok) {
          result.stripeResynced += 1;
        } else {
          result.errors.push(syncResult.error);
        }
      } catch (error) {
        result.errors.push(
          error instanceof Error ? error.message : "Stripe-synk feilet.",
        );
      }
      continue;
    }

    try {
      const nextStatus = row.provider_customer_id ? "incomplete" : "canceled";
      await admin
        .from("organizations")
        .update({ subscription_status: nextStatus })
        .eq("id", row.organization_id);

      await admin
        .from("subscriptions")
        .update({ status: nextStatus })
        .eq("organization_id", row.organization_id);

      result.expiredLocalTrials += 1;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Utløpt prøveperiode feilet.",
      );
    }
  }

  if (!stripe) {
    return result;
  }

  const { data: stalePastDue, error: pastDueError } = await admin
    .from("subscriptions")
    .select("organization_id, provider_subscription_id")
    .eq("status", "past_due")
    .not("provider_subscription_id", "is", null);

  if (pastDueError) {
    result.errors.push(pastDueError.message);
    return result;
  }

  for (const row of stalePastDue ?? []) {
    if (!row.provider_subscription_id) continue;

    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        row.provider_subscription_id,
        { expand: ["items.data"] },
      );
      const syncResult = await syncSubscriptionFromStripe({
        organizationId: row.organization_id,
        stripeSubscription,
      });
      if (syncResult.ok) {
        result.pastDueResynced += 1;
      } else {
        result.errors.push(syncResult.error);
      }

      if (
        stripeSubscription.status === "canceled" ||
        stripeSubscription.status === "incomplete_expired"
      ) {
        await markOrganizationCanceled(row.organization_id);
      }
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : "Past-due synk feilet.",
      );
    }
  }

  return result;
}
