# Security Secrets Checklist

## Never commit

- [ ] `.env.local`, `.env.production`, `.env.test.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] `CRON_SECRET`
- [ ] Live Stripe keys (`sk_live_`, `pk_live_`) in repo

## Server-only keys

| Variable | Client safe? | Where used |
|----------|--------------|------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | `supabase-admin.ts`, webhooks, cron, register |
| `STRIPE_SECRET_KEY` | **No** | Billing server actions |
| `STRIPE_WEBHOOK_SECRET` | **No** | Webhook handler |
| `CRON_SECRET` | **No** | Cron routes |

## Verification commands

```bash
# Service role must not appear in client components
rg "SUPABASE_SERVICE_ROLE_KEY" src/components src/app --glob "*.tsx"

# Live Stripe keys in source
rg "sk_live_|pk_live_" --glob "!node_modules"

# Committed env files
git ls-files | rg "\.env"
```

## If a secret was committed

1. Rotate the key in Supabase / Stripe / Vercel immediately.
2. Remove from git history if still in recent commits (careful with force push).
3. Document rotation date in team runbook.

## Test environments

- Copy `.env.test.example` → `.env.test.local` (gitignored).
- Use sandbox Stripe keys only (`sk_test_`, `pk_test_`).
