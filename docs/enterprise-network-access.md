# Enterprise network access (eventmanager.no)

Internal runbook for support and sales when customers report that the website is blocked on corporate networks.

## What the customer sees

Norwegian Microsoft organizational block (example):

> Dette innholdet er blokkert av organisasjonen  
> Driftet av eventmanager.no

This is **not an application outage**. The customer's IT policy (Microsoft Defender for Endpoint, Entra Internet Access, Zscaler, Cisco Umbrella, etc.) blocks the domain **before** traffic reaches Vercel.

## Phase 0 — Diagnostic questions

Ask the customer (or their IT admin):

1. Browser and device: Edge/Chrome on a **managed** work device vs personal device?
2. Exact URL blocked: `https://eventmanager.no`, `/auth/login`, `/app`, etc.?
3. Security product name and block **category** (often: Uncategorized, Newly registered domains, Business).
4. Does the site work on mobile data or home network? (confirms corporate policy)

**Success criteria:** IT admin confirms an explicit policy rule — not TLS, DNS, or HTTP 5xx errors.

## External reputation checks (run periodically)

| Check | URL |
|-------|-----|
| Google Safe Browsing | https://transparencyreport.google.com/safe-browsing/search |
| VirusTotal domain | https://www.virustotal.com/ |
| Security headers | https://securityheaders.com/?q=https://eventmanager.no |
| SSL Labs | https://www.ssllabs.com/ssltest/analyze.html?d=eventmanager.no |

### Baseline scan (2026-06-16, pre-deploy)

- Production `eventmanager.no` returns HTTP 200 via Vercel.
- Vercel already sends `Strict-Transport-Security: max-age=63072000`.
- `/.well-known/security.txt` was 404 before this remediation (fixed in repo).
- Application-level headers (X-Frame-Options, Referrer-Policy, etc.) were missing before `next.config.ts` update.

If any scanner flags malware/phishing, treat as a **reputation incident** and open vendor dispute workflows — separate from organizational policy blocks.

## Domains for IT allowlist

Share the public page: **https://eventmanager.no/it**

| Purpose | Host |
|---------|------|
| Application | `eventmanager.no` |
| Application (www) | `www.eventmanager.no` → CNAME to Vercel project (must be added in Vercel Domains + SSL cert) |
| API / auth (Supabase) | Value of `NEXT_PUBLIC_SUPABASE_URL` hostname (project-specific) |
| Payments (Stripe redirect) | `checkout.stripe.com`, `billing.stripe.com`, `js.stripe.com` |

Suggested policy categories: Business, Productivity, SaaS.

## Production configuration

Verify in Vercel production environment:

```bash
NEXT_PUBLIC_APP_URL=https://eventmanager.no
```

**Status (2026-06-16):** Production was incorrectly set to `https://ronningen-crm.vercel.app` and updated to `https://eventmanager.no` during this remediation. Redeploy production after env changes so Next.js build picks up the value.

Wrong values break Stripe return URLs and can confuse security scanners.

Check with:

```bash
npm run verify:billing-env   # if available
# or Vercel dashboard → Project → Settings → Environment Variables
```

## Email DNS (trust signals)

Ensure SPF, DKIM, and DMARC are configured for mail sent from `@eventmanager.no` (e.g. Resend / `RESEND_FROM_EMAIL`). Weak email authentication increases phishing-adjacency risk for domain reputation.

Verify:

```bash
dig TXT eventmanager.no
dig TXT _dmarc.eventmanager.no
dig MX eventmanager.no
```

## Microsoft-specific steps

1. **Organizational block:** Customer IT must allowlist `eventmanager.no` (and Supabase host). No code change can override tenant policy.
2. **Unsafe site false positive:** https://www.microsoft.com/en-us/wdsi/support/report-unsafe-site-guest
3. **Category recategorization:** Slow; customer allowlist is faster.

## Application hardening shipped in repo

- Security headers in `next.config.ts` (no strict CSP in v1 — avoids breaking Supabase auth).
- `public/.well-known/security.txt` (RFC 9116).
- `src/app/robots.ts` — disallow `/app/`, `/admin/`, `/api/`.
- `src/lib/security/safe-redirect.ts` — centralized post-login redirect validation.
- Public IT page: `src/app/it/page.tsx`.

## Post-deploy verification

```bash
npm run typecheck
npm test
curl -I https://eventmanager.no/.well-known/security.txt   # expect 200
curl -I https://eventmanager.no/robots.txt                   # expect 200
```

Manual smoke tests:

- Login with `?redirect=/app/dashboard` → lands on dashboard.
- Login with `?redirect=https://evil.com` → falls back to `/app`.
- Stripe checkout return URL still uses `https://eventmanager.no`.

## Security contact

- `security@eventmanager.no`
- `admin@eventmanager.no` (backup)
- Policy: https://eventmanager.no/it#sikkerhet
