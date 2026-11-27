# Testing Strategy

## Layers

```
┌─────────────────────────────────────────┐
│  E2E (Playwright) — smoke + core flows  │
├─────────────────────────────────────────┤
│  API route tests (Vitest + mocks)       │
├─────────────────────────────────────────┤
│  Component tests (Vitest + jsdom + RTL) │
├─────────────────────────────────────────┤
│  Unit tests (Vitest + node)             │
├─────────────────────────────────────────┤
│  Manual checklists (RLS, Stripe, admin) │
└─────────────────────────────────────────┘
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | All Vitest unit/API/component tests |
| `npm run test:security` | Security-critical lib paths only |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run test:all` | typecheck + lint + unit + e2e |
| `node scripts/security/rls-audit.mjs` | Migration RLS scanner |

## What to test where

**Unit (node):** Pure functions — permissions, subscription access, validations, query keys, filters, metrics.

**API (node):** Route handlers with mocked Supabase/Stripe — no live network.

**Component (jsdom):** Theme toggle, language switcher — behavior and a11y only.

**E2E (Playwright):** Page loads, auth redirects, admin gate — against `localhost:3000`.

**Manual:** RLS cross-tenant SQL, Stripe sandbox checkout, admin destructive actions.

## Environment rules

See [testing-environments.md](./testing-environments.md).

- Never run destructive cleanup against production.
- E2E helpers require `TEST_ENV=true`.
- Stripe E2E skipped when `STRIPE_SECRET_KEY` unset.

## CI

GitHub Actions runs `typecheck`, `lint`, `test:unit` on push/PR. E2E optional until CI secrets configured.

## Adding new tests

1. Co-locate `*.test.ts` next to source for lib modules.
2. Put shared mocks in `tests/helpers/`.
3. Prefer behavior assertions over implementation details.
4. Do not snapshot full pages.
5. Add `data-testid` only when roles/labels insufficient.
