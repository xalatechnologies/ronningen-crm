# Security Audit — Master Findings Log

Event Manager / Rønningen CRM — `feature/qa-security-reliability-audit`

## Severity legend

| Level | Meaning |
|-------|---------|
| Critical | Exploitable now; data leak; auth bypass; payment risk |
| High | Likely security issue; tenant isolation; serious reliability |
| Medium | Missing validation; weak error handling; test gap |
| Low | Docs; cleanup; consistency |

## Findings

### Critical

| ID | Finding | Status | Action |
|----|---------|--------|--------|
| C1 | Tenant isolation depends on Supabase RLS — not fully automated | Open | RLS scanner + manual checklist; no policy changes in audit |
| C2 | Stripe webhook must reject unsigned requests | Mitigated | Unit tests added for `handleStripeWebhookRequest` |

### High

| ID | Finding | Status | Action |
|----|---------|--------|--------|
| H1 | Service role used in ~40 server files | Documented | Verify `server-only`; secrets checklist |
| H2 | `/api/auth/register` uses admin `createUser` | Documented | API validation tests; rate limit review (future) |
| H3 | Platform admin impersonation cookie | Documented | Admin security checklist |
| H4 | No CI until this audit | Fixed | GitHub Actions workflow added |
| H5 | Middleware does not gate API/cron routes | By design | CRON_SECRET + Stripe signature compensate |

### Medium

| ID | Finding | Status | Action |
|----|---------|--------|--------|
| M1 | `canAccessRoute()` always returns `true` | Documented | Do not change in audit; future role-based routes |
| M2 | No E2E before audit | Mitigated | Playwright smoke added |
| M3 | Onboarding/support forms lack Zod | Documented | Validation audit backlog |
| M4 | Duplicate Stripe webhook URLs | Documented | Both use same handler |

### Low

| ID | Finding | Status | Action |
|----|---------|--------|--------|
| L1 | No test coverage reporting | Open | Optional vitest coverage later |
| L2 | `npm audit` vulnerabilities in dev deps | Open | Review `npm audit` output in final report |

## Automated scans performed

```bash
node scripts/security/rls-audit.mjs
npm audit
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/components  # should be empty
grep -r "dangerouslySetInnerHTML" src/
```

## Auth model verified

- Middleware: session + `/admin` RPC
- App layout: `requireTenantAppAccess`
- Admin layout: `requirePlatformAdmin`
- Open redirects: `safe-redirect.ts` (tested)

## Next review

After major billing or RLS migration changes, re-run:

```bash
npm run test:security
node scripts/security/rls-audit.mjs
```
