/** Stripe subscription statuses that block creating a new checkout session. */
export const BLOCKING_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
]);

/** Stripe subscription statuses eligible for post-checkout sync. */
export const SYNCABLE_STRIPE_SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "incomplete",
]);
