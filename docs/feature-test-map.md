# Feature Test Map

Maps product areas to routes, key modules, and test coverage targets.

## Public & auth

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Landing | `/`, `/it` | `components/landing/` | E2E smoke |
| Login | `/auth/login` | `login-form.tsx`, `validations.ts` | E2E, validation unit |
| Register | `/auth/register` | `api/auth/register` | E2E, API unit |
| Forgot password | `/auth/forgot-password` | auth pages | E2E smoke |
| Safe redirect | redirect param | `safe-redirect.ts` | Unit (exists) |

## Onboarding & gates

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Create org | `/app/onboarding` | `create-organization-form.tsx` | E2E core (manual seed) |
| Suspended | `/app/suspended` | `subscription-utils.ts` | Unit (exists) |
| Tenant access | all `/app/*` | `require-tenant-app-access.ts` | Unit (added) |
| Tenant setup | settings paths | `tenant-setup.ts` | Unit (exists) |

## Tenant CRM

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Dashboard | `/app/dashboard` | `fetch-dashboard.ts` | E2E smoke |
| Inquiries | `/app/inquiries` | `inquiries/`, `validations.ts` | Validation unit |
| Bookings | `/app/bookings` | `bookings/`, calendar | E2E core |
| Accommodation | `/app/overnatting` | `overnatting/` | Manual |
| Customers | `/app/customers` | `customers/`, partners | Validation unit |
| Partners | customers tab | `partner-category.ts` | Unit (exists) |

## Commercial

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Pricing | `/app/pricing` | `pricing-section.tsx` | Manual |
| Finance | `/app/finance` | `finance-section.tsx` | Permission unit |
| Invoices | `/app/invoices` | invoice workspace | E2E core |
| Invoice print | `/app/invoices/print/[id]` | print layout | Tenant isolation checklist |

## Settings & billing

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Org profile | `/app/settings/organization` | `organization-profile-form.tsx` | Validation unit |
| Team | `/app/settings/team` | `team-members-section.tsx` | Permission unit |
| Billing | `/app/settings/billing` | `billing-service.ts`, checkout actions | Unit + billing checklist |
| Account | `/app/settings/account` | account page | Manual |

## Admin platform

| Feature | Routes | Key modules | Tests |
|---------|--------|-------------|-------|
| Overview | `/admin` | admin KPIs | E2E (platform admin) |
| Organizations | `/admin/organizations` | org actions | Admin checklist |
| Subscriptions | `/admin/subscriptions` | Stripe admin | Billing checklist |
| Users | `/admin/users` | user admin actions | Admin checklist |
| Audit | `/admin/audit` | `audit-log.ts` | Manual |
| Impersonation | cookie | `impersonation.ts` | Admin checklist |
| Feature flags | `/admin/feature-flags` | `feature-flags.ts` | Unit (exists) |

## API & cron

| Route | Tests |
|-------|-------|
| `POST /api/webhooks/stripe` | Unit handler + API route |
| `GET /api/cron/billing-enforcement` | API route (CRON_SECRET) |
| `GET /api/cron/trial-reminders` | API route (CRON_SECRET) |
| `POST /api/auth/register` | API route (validation) |
| `GET /api/auth/destination` | API route (auth) |

## Cross-cutting

| Area | Module | Tests |
|------|--------|-------|
| Query keys | `tenant-query-keys.ts` | Unit (added) |
| Permissions | `organization-permissions.ts` | Unit (added) |
| i18n | `nav-labels.ts` | Smoke unit |
| Feature flags | `feature-flags.ts` | Admin unit (exists) |
| Middleware | `middleware.ts` | Documented + E2E redirects |
