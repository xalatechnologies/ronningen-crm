/**
 * Creates Stripe product + 500 NOK/month price for SaaS billing.
 * Usage: node --env-file=.env.local scripts/stripe-setup.mjs
 */
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY mangler i .env.local");
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2026-05-27.dahlia",
});

const product = await stripe.products.create({
  name: "Event Manager Standard",
  description: "Månedlig abonnement for Event Manager CRM",
  metadata: { plan_id: "standard" },
});

const price = await stripe.prices.create({
  product: product.id,
  currency: "nok",
  unit_amount: 50000,
  recurring: { interval: "month" },
  metadata: { plan_id: "standard" },
});

console.log("Stripe product:", product.id);
console.log("Stripe price (set STRIPE_PRICE_STANDARD):", price.id);
console.log("\nAdd to .env.local:");
console.log(`STRIPE_PRICE_STANDARD=${price.id}`);
console.log(`STRIPE_PRODUCT_STANDARD=${product.id}`);
console.log(`# Legacy alias:`);
console.log(`STRIPE_PRICE_ID=${price.id}`);
