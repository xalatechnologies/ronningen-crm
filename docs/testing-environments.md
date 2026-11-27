# Testing Environments

## Rules

1. **Never** run automated destructive cleanup against production Supabase.
2. Use **local** or **dev** Supabase project for E2E and integration tests.
3. Copy [.env.test.example](../.env.test.example) to `.env.test.local` — never commit real secrets.
4. Set `TEST_ENV=true` before E2E helpers that create/delete data.
5. Prefix test records with `TEST_` for safe identification.

## Required variables (example)

See `.env.test.example` for the full list.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dev project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; E2E seed scripts |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `TEST_ENV` | Must be `true` for data mutation helpers |
| `CRON_SECRET` | Cron route tests |
| `STRIPE_*` | Optional; sandbox only |

## Running unit tests

```bash
npm run test:unit
```

No Supabase connection required for most unit tests (mocked).

## Running E2E tests

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

Playwright config uses `baseURL: http://localhost:3000`.

## Running security-focused unit tests

```bash
npm run test:security
```

## Running RLS audit

```bash
node scripts/security/rls-audit.mjs
```

Read-only scan of `supabase/migrations/` — no database connection.

## Seeding test users

Use existing project scripts:

```bash
npm run admin:seed   # platform admin (local .env.local)
```

Document test credentials in your local `.env.local` only — not in git.

## Safe local data reset

Use Supabase CLI local stack or SQL editor on **dev project only**:

```bash
# Local Supabase only — never on production
npx supabase db reset --local
```

## Production guard

`tests/helpers/assert-test-environment.ts` refuses cleanup when:

- `TEST_ENV` is not `true`, or
- `NEXT_PUBLIC_SUPABASE_URL` matches known production host patterns
