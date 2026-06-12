/** Whether the org must complete Stripe Checkout (no active Stripe subscription yet). */
export function needsStripeCheckout(input: {
  billingEnabled: boolean;
  hasStripeSubscription: boolean;
  status: string;
  trialExpired: boolean;
}): boolean {
  if (!input.billingEnabled || input.hasStripeSubscription) {
    return false;
  }

  if (
    input.status === "incomplete" ||
    input.status === "canceled" ||
    input.trialExpired
  ) {
    return true;
  }

  // Legacy orgs (manual trial/active) when billing is turned on — require Stripe setup.
  if (input.status === "trialing" || input.status === "active") {
    return true;
  }

  return false;
}

/** Whether Stripe Customer Portal should be offered (existing Stripe customer/sub). */
export function canManageStripeSubscription(input: {
  billingEnabled: boolean;
  hasStripeSubscription: boolean;
  hasStripeCustomer: boolean;
  status: string;
}): boolean {
  if (!input.billingEnabled) return false;
  if (input.hasStripeSubscription) return true;
  return input.hasStripeCustomer && input.status === "past_due";
}
