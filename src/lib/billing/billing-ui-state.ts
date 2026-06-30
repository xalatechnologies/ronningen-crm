/** Whether the org must complete Stripe Checkout (blocks app access). */
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

  // Active local trial — checkout is optional until expiry.
  if (input.status === "trialing" && !input.trialExpired) {
    return false;
  }

  // Legacy active without Stripe when billing is on.
  if (input.status === "active") {
    return true;
  }

  return false;
}

/** Whether owner may connect Stripe voluntarily during local trial. */
export function canOfferStripeCheckout(input: {
  billingEnabled: boolean;
  hasStripeSubscription: boolean;
  status: string;
  trialExpired: boolean;
}): boolean {
  if (!input.billingEnabled || input.hasStripeSubscription) {
    return false;
  }
  return input.status === "trialing" && !input.trialExpired;
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
