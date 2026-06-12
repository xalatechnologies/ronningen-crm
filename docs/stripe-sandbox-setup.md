# Stripe sandbox setup (Event Manager)

This guide configures **real Stripe test-mode billing** for local development. No mock billing — subscriptions, checkout, webhooks, and portal use Stripe’s sandbox API.

Sandbox payments do **not** move real money. Sandbox data is isolated from live mode.

## Prerequisites

- Stripe account with **Test mode** enabled
- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed
- Local Supabase + Next.js dev server
- `.env.local` (never commit secrets)

## 1. Environment variables

Copy from [`.env.example`](../.env.example):

```env
BILLING_ENABLED=true
NEXT_PUBLIC_BILLING_ENABLED=true
BILLING_MODE=sandbox

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRODUCT_STANDARD=prod_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-local-cron-secret
```

- Use **test** keys (`sk_test_`, `pk_test_`) for sandbox.
- `STRIPE_PRICE_ID` is a legacy alias for `STRIPE_PRICE_STANDARD`.
- Never expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## 2. Create product and price

From the repo root:

```bash
npm run stripe:setup
```

This creates **Event Manager Standard** at 500 NOK/month and prints IDs for `.env.local`.

Alternatively create manually in [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products) (Test mode).

## 3. Customer Portal

In Stripe Dashboard → **Settings → Billing → Customer portal**, enable:

- Cancel subscription
- Update payment method
- View invoices

Portal sessions return to `/app/settings/billing`.

## 4. Webhook forwarding (local)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

The legacy endpoint `/api/stripe/webhook` also works.

### Handled events

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end` (logged; reminders via cron)

## 5. Test checkout

1. `npm run dev`
2. Log in as **organization owner**
3. Open `/app/settings/billing`
4. Confirm **Testmiljø** banner
5. Click **Start abonnement**
6. Complete Checkout with a [Stripe test card](https://docs.stripe.com/testing), e.g. `4242 4242 4242 4242`

Verify:

- Webhook received in Stripe CLI
- Row in `subscriptions` updated (`provider_subscription_id`, status)
- `organizations.subscription_status` synced
- App access is **full** for `trialing` / `active`

## 6. Test portal

With an active subscription, click **Administrer abonnement**. Cancel or update payment method in Stripe Portal; confirm webhook updates local status.

## 7. Optional CLI triggers

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

Real Checkout flows are often easier for end-to-end testing.

## 8. Switch to live mode (later)

Change env only — **no code changes**:

| Variable | Live value |
|----------|------------|
| `BILLING_MODE` | `live` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signing secret |
| `STRIPE_PRICE_STANDARD` | Live price ID |
| `STRIPE_PRODUCT_STANDARD` | Live product ID |

Register production webhook: `https://your-domain.com/api/webhooks/stripe`

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Checkout disabled | `BILLING_ENABLED=true`, all Stripe env vars set |
| Webhook 400 | `STRIPE_WEBHOOK_SECRET` matches `stripe listen` output |
| Stuck on `incomplete` after checkout | Webhook running; post-checkout sync lists subs by customer |
| Portal error | Customer Portal configured in Stripe Dashboard |
| Cron not running | `CRON_SECRET` set; Vercel cron on production |

## Related code

- Checkout/portal: `src/lib/billing/billing-service.ts`
- Webhook: `src/lib/billing/stripe-webhook-handler.ts`
- Sync: `src/lib/billing/sync-subscription-from-stripe.ts`
- Access gate: `src/lib/subscriptions/subscription-utils.ts`
