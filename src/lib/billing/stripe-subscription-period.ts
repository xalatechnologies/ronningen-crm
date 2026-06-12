import type Stripe from "stripe";

/** Stripe v22+ stores billing periods on subscription items, not the subscription root. */
export function getStripeSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: number | null;
  periodEnd: number | null;
} {
  const firstItem = subscription.items?.data?.[0];

  if (firstItem?.current_period_start && firstItem.current_period_end) {
    return {
      periodStart: firstItem.current_period_start,
      periodEnd: firstItem.current_period_end,
    };
  }

  if (subscription.status === "trialing" && subscription.trial_end) {
    return {
      periodStart: subscription.billing_cycle_anchor ?? null,
      periodEnd: subscription.trial_end,
    };
  }

  return {
    periodStart: subscription.billing_cycle_anchor ?? null,
    periodEnd: subscription.trial_end ?? null,
  };
}

export function resolveInvoiceSubscriptionId(
  invoice: Stripe.Invoice,
): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return fromParent.id;
  }
  return null;
}
