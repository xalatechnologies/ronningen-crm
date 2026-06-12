import { isStripeConfigured } from "@/lib/billing/constants";
import { getStripeClient } from "@/lib/billing/stripe";

export function getStripeCustomerUrl(customerId: string): string {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

export async function retryStripeInvoicePayment(
  providerSubscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe er ikke konfigurert." };
  }

  try {
    const stripe = getStripeClient();
    const subscription =
      await stripe.subscriptions.retrieve(providerSubscriptionId);
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: providerSubscriptionId,
      status: "open",
      limit: 1,
    });

    const invoice = invoices.data[0];
    if (!invoice) {
      return { ok: false, error: "Ingen åpen faktura funnet." };
    }

    await stripe.invoices.pay(invoice.id);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Stripe-betaling feilet.",
    };
  }
}

export async function cancelStripeSubscription(
  providerSubscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe er ikke konfigurert." };
  }

  try {
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(providerSubscriptionId);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Kunne ikke avslutte abonnement.",
    };
  }
}
