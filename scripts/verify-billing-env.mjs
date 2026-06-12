/**
 * Checks .env.local billing configuration without printing secret values.
 * Usage: node --env-file=.env.local scripts/verify-billing-env.mjs
 */

function val(name) {
  return process.env[name]?.trim() || "";
}

function isSet(name) {
  return Boolean(val(name));
}

function mask(name) {
  const v = val(name);
  if (!v) return "(empty)";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 7)}… (${v.length} chars)`;
}

const billingOn =
  val("BILLING_ENABLED") === "true" ||
  val("NEXT_PUBLIC_BILLING_ENABLED") === "true";
const mode = (val("BILLING_MODE") || "sandbox").toLowerCase();
const priceId = val("STRIPE_PRICE_STANDARD") || val("STRIPE_PRICE_ID");

const rows = [
  ["NEXT_PUBLIC_APP_URL", isSet("NEXT_PUBLIC_APP_URL"), val("NEXT_PUBLIC_APP_URL") || "(empty)"],
  ["BILLING_MODE", true, mode],
  ["BILLING_ENABLED", true, val("BILLING_ENABLED") || "false"],
  ["NEXT_PUBLIC_BILLING_ENABLED", true, val("NEXT_PUBLIC_BILLING_ENABLED") || "false"],
  ["STRIPE_SECRET_KEY", isSet("STRIPE_SECRET_KEY"), mask("STRIPE_SECRET_KEY")],
  [
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    isSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    mask("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  ],
  ["STRIPE_WEBHOOK_SECRET", isSet("STRIPE_WEBHOOK_SECRET"), mask("STRIPE_WEBHOOK_SECRET")],
  ["STRIPE_PRICE_STANDARD", Boolean(priceId), priceId ? mask("STRIPE_PRICE_STANDARD") : "(empty)"],
  ["STRIPE_PRODUCT_STANDARD", isSet("STRIPE_PRODUCT_STANDARD"), mask("STRIPE_PRODUCT_STANDARD")],
  ["CRON_SECRET", isSet("CRON_SECRET"), isSet("CRON_SECRET") ? "(set)" : "(empty)"],
];

console.log("Billing env check\n");
for (const [name, ok, detail] of rows) {
  console.log(`${ok ? "✓" : "✗"} ${name}: ${detail}`);
}

const blockers = [];

if (!billingOn) {
  blockers.push("Set BILLING_ENABLED=true and NEXT_PUBLIC_BILLING_ENABLED=true");
}
if (billingOn && !isSet("STRIPE_SECRET_KEY")) {
  blockers.push("STRIPE_SECRET_KEY missing — Stripe Dashboard → Developers → API keys (test mode)");
}
if (billingOn && !isSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")) {
  blockers.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing");
}
if (billingOn && !priceId) {
  blockers.push("STRIPE_PRICE_STANDARD missing — run: npm run stripe:setup");
}
if (billingOn && !isSet("STRIPE_WEBHOOK_SECRET")) {
  blockers.push(
    "STRIPE_WEBHOOK_SECRET missing — run: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
  );
}
if (billingOn && !isSet("NEXT_PUBLIC_APP_URL")) {
  blockers.push("NEXT_PUBLIC_APP_URL missing — use http://localhost:3000 locally");
}

if (billingOn && isSet("STRIPE_SECRET_KEY") && isSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")) {
  const skTest = val("STRIPE_SECRET_KEY").startsWith("sk_test_");
  const pkTest = val("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY").startsWith("pk_test_");
  if (mode === "sandbox" && (!skTest || !pkTest)) {
    blockers.push("BILLING_MODE=sandbox requires sk_test_ and pk_test_ keys");
  }
  if (mode === "live") {
    if (!val("STRIPE_SECRET_KEY").startsWith("sk_live_")) {
      blockers.push("BILLING_MODE=live requires sk_live_ secret key");
    }
    if (!val("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY").startsWith("pk_live_")) {
      blockers.push("BILLING_MODE=live requires pk_live_ publishable key");
    }
  }
}

console.log("");
if (blockers.length === 0 && billingOn) {
  console.log("Ready for Stripe sandbox testing.");
  console.log("Next: npm run dev + stripe listen (separate terminal), then /app/settings/billing");
  process.exit(0);
}

if (!billingOn) {
  console.log("Billing is disabled — app works without Stripe until you enable the flags above.");
}

if (blockers.length > 0) {
  console.log("Blockers:");
  blockers.forEach((b) => console.log(`  • ${b}`));
  process.exit(1);
}

process.exit(0);
