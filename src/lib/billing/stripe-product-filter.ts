import type Stripe from "stripe";

type SubscriptionItems = { items: { data: { price?: { id?: string | null; product?: string | { id: string } | null } | null }[] } };

/**
 * One Stripe account can serve several products (Event Manager and Digilist share it). Webhook events for the
 * other products must not be handled here, and must not be retried by Stripe. A subscription is ours when it is on
 * the configured Event Manager product (or price, when no product id is configured).
 * With nothing configured we cannot tell, so we accept it, as before.
 */
export function isEventManagerSubscription(
  subscription: SubscriptionItems | Pick<Stripe.Subscription, "items">,
  config: { productId: string | null; priceId: string | null },
): boolean {
  if (!config.productId && !config.priceId) return true;

  return (subscription.items.data as SubscriptionItems["items"]["data"]).some((item) => {
    const product = item.price?.product;
    const productId = typeof product === "string" ? product : (product?.id ?? null);
    if (config.productId) return productId === config.productId;
    return item.price?.id === config.priceId;
  });
}
