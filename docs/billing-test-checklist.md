# Billing Test Checklist

See also [stripe-sandbox-setup.md](./stripe-sandbox-setup.md).

## Environment

- [ ] `BILLING_ENABLED=true` only when Stripe configured
- [ ] `BILLING_MODE=sandbox` in non-production
- [ ] `assertBillingConfigured()` passes before checkout

## Checkout / portal

- [ ] Non-owner cannot create checkout session
- [ ] Owner can start checkout (sandbox) when env configured
- [ ] `billing_exempt` org skips enforcement and checkout guards
- [ ] Portal session requires owner

## Webhook

- [ ] `POST /api/webhooks/stripe` without signature → 400
- [ ] Invalid signature → 400
- [ ] Missing `STRIPE_WEBHOOK_SECRET` → 500
- [ ] Livemode event in sandbox mode → 200 ignored
- [ ] Duplicate `event_id` → idempotent (200 duplicate)

## Cron

- [ ] `/api/cron/billing-enforcement` without `CRON_SECRET` → 401
- [ ] Valid bearer → 200
- [ ] Exempt orgs skipped by enforcement logic

## Automated tests

```bash
npm run test:security
# stripe-webhook-handler.test.ts, billing-env.test.ts, cron route tests
```

## E2E (optional, sandbox)

Skip when `STRIPE_SECRET_KEY` unset. Manual:

1. Owner opens `/app/settings/billing`.
2. Start checkout → Stripe test card `4242...`.
3. Webhook received in Stripe CLI or dashboard.
4. Subscription status updates in app.
