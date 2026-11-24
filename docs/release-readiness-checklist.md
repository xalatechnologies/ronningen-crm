# Release Readiness Checklist

## Code quality

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run test:unit` passes

## Security

- [ ] No secrets in diff
- [ ] `node scripts/security/rls-audit.mjs` reviewed
- [ ] Tenant isolation checklist spot-checked (staging)
- [ ] Stripe webhook endpoint configured for production URL
- [ ] `CRON_SECRET` set in Vercel

## Database

- [ ] Migrations applied to production Supabase
- [ ] No destructive migration without backup plan

## Billing

- [ ] `BILLING_MODE=live` only in production
- [ ] Live Stripe keys in production env only
- [ ] `billing_exempt` set for platform org if applicable

## Deploy

- [ ] Vercel production deploy successful
- [ ] `eventmanager.no` SSL valid (apex + www)
- [ ] Smoke: login, dashboard, admin (if admin user)

## Post-deploy

- [ ] Monitor Stripe webhook delivery
- [ ] Check `/admin/system-health` for cron job runs
