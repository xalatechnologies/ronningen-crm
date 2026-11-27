# QA Discovery Report — Event Manager / Rønningen CRM

Generated as part of the `feature/qa-security-reliability-audit` branch.

## 1. Current testing setup

| Item | Status |
|------|--------|
| Framework | Vitest 3 (`npm test` → `vitest run`) |
| Environment | Node only ([vitest.config.ts](../vitest.config.ts)) |
| Component tests | None (no React Testing Library) |
| E2E | None (Playwright added in this audit) |
| CI | GitHub Actions added in this audit |
| Coverage | Not configured |
| Fixtures | `tests/helpers/`, `tests/fixtures/` added in this audit |

**Existing tests:** 40 co-located `*.test.ts` files under `src/`.

Strong coverage in: admin filters/metrics, billing UI state, notifications, reports, auth helpers, tenant org resolution.

## 2. Main app modules

### Public & auth
- Landing `/`, `/it`
- `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/confirm`

### Tenant app (`/app`)
- Dashboard, inquiries, bookings, overnatting, customers, pricing, finance, invoices (+ print), assets, reports, notifications
- Onboarding, suspended, settings (org, lokaler, team, billing, support, account)

### Admin (`/admin`)
- Overview, organizations, subscriptions, users, revenue, support, system-health, audit, feature-flags, notifications, settings, search

### API
- `/api/auth/register`, `/api/auth/destination`
- `/api/webhooks/stripe`, `/api/stripe/webhook` (duplicate alias)
- `/api/cron/billing-enforcement`, `/api/cron/trial-reminders`

## 3. Authentication model

```
Request → middleware (session refresh, anon key)
       → /admin: RPC is_current_user_platform_admin
       → /app: requireTenantAppAccess in app layout
       → Server actions: createServerSupabaseClient (RLS)
       → Webhooks/cron: signature or CRON_SECRET + service role
```

- Open redirects guarded by `safe-redirect.ts` (tested).
- Billing/suspension/setup enforced in layout, not middleware.

## 4. Multi-tenant model

- `organization_id` on tenant tables; RLS via `user_organization_ids()`, `is_org_member()`, `has_org_role()`.
- Active org from `profiles.active_organization_id` + memberships.
- React Query keys scoped by `orgId` in `tenant-query-keys.ts`.
- Platform admin impersonation via httpOnly cookie (`platform_impersonation_org_id`).

## 5. Role and permission model

Roles: `owner`, `admin`, `manager`, `accountant`, `viewer`.

Helpers in `organization-permissions.ts`:
- `canManageFinance`, `canManageBookings`, `canManageMembers`, etc.
- **Known gap:** `canAccessRoute()` always returns `true` — documented, not changed in this audit.

## 6. Billing and Stripe model

- Feature flag + env: `BILLING_ENABLED`, sandbox/live via `billing-env.ts`.
- Owner-only checkout/portal (`require-organization-owner.ts`).
- `billing_exempt` orgs skip Stripe enforcement.
- Webhook: signature verify, livemode guard, idempotency via `stripe_webhook_events`.
- Cron: daily billing enforcement + trial reminders (`CRON_SECRET`).

## 7. Admin backoffice model

- Triple guard: middleware RPC + `requirePlatformAdmin()` layout + per-action checks.
- Service role (`supabase-admin.ts`) for admin mutations, webhooks, register API.
- Destructive actions (suspend, delete org) require confirmation in UI; audited.

## 8. Supabase / RLS model

- ~94 `CREATE POLICY` statements across 13 migration files.
- Helpers: `20260608150000_saas_rls_helpers.sql`, `is_current_user_platform_admin`.
- RLS audit script: `scripts/security/rls-audit.mjs`.

## 9. High-risk files

| File | Risk |
|------|------|
| `src/lib/billing/stripe-webhook-handler.ts` | Payment integrity, service role |
| `src/lib/admin/supabase-admin.ts` | Bypasses RLS |
| `src/lib/admin/impersonation.ts` | Cross-tenant access |
| `src/app/api/auth/register/route.ts` | Service role user creation |
| `src/lib/supabase/middleware.ts` | Session + admin gate |
| `src/lib/organizations/require-tenant-app-access.ts` | Tenant billing/suspension gate |

## 10. Missing tests (before this audit)

- Middleware, `require-platform-admin`, `require-tenant-app-access`
- Stripe webhook handler, cron auth
- API route integration tests
- `organization-permissions`, validation schemas
- E2E smoke flows
- RLS automated integration (documented via checklist + scanner)

## 11. Security risks (pre-audit)

| Severity | Item |
|----------|------|
| Critical | Tenant isolation depends on RLS — must verify per table |
| Critical | Webhook must reject unsigned requests |
| High | Service role surface area (~40 files) |
| High | Register API uses admin client |
| High | Impersonation cookie scope |
| Medium | `canAccessRoute` noop |
| Medium | No CI until this audit |
| Low | Forms without Zod (onboarding, support) |

## 12. Recommended test strategy

See [testing-strategy.md](./testing-strategy.md) and [feature-test-map.md](./feature-test-map.md).

1. **Unit** — pure logic, guards, validations (Vitest, node).
2. **API** — route handlers with mocked Stripe/Supabase (Vitest).
3. **Component** — theme/language toggles only (Vitest + jsdom + RTL).
4. **E2E smoke** — public pages, auth redirects, admin gate (Playwright).
5. **Manual** — RLS, tenant isolation, Stripe sandbox (checklists).
