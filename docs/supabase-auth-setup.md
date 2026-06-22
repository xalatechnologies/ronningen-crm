# Supabase Auth — registration and email

Runbook for customer-facing auth issues on eventmanager.no.

## Symptoms customers reported

| Error (English) | Cause |
|-----------------|-------|
| `Email address "…" is invalid` | Supabase Auth rejected the address (format, DNS check, or domain allowlist in Supabase dashboard). |
| `email rate limit exceeded` | Too many auth emails sent via Supabase **built-in SMTP** (very low hourly cap). Users often retry when confirmation does not work. |

## Application fixes (in repo)

1. **Server registration** — `POST /api/auth/register` creates users with the service role, confirms email immediately, and signs the user in. This avoids sending a signup confirmation email on each attempt (removes the main rate-limit trigger).
2. **PKCE confirm route** — `/auth/confirm` handles email links for password reset (and legacy signup links).
3. **Email normalization** — trim, lowercase, strip zero-width characters before validation.
4. **Norwegian error messages** — `mapAuthErrorToNorwegian()` in auth UI.

## Required Supabase dashboard settings

### Redirect URLs

**Authentication → URL Configuration** must include:

- `https://eventmanager.no/auth/confirm`
- `https://eventmanager.no/auth/login`
- `https://eventmanager.no/app/onboarding`

### Email domain allowlist

**Authentication → Providers → Email** — ensure **domain allowlist / authorized domains** is **disabled** unless you intentionally restrict signups. Custom business domains (e.g. `@ronningenselskapslokale.no`) will fail with “invalid email” if allowlist is on.

### Custom SMTP (recommended for password reset volume)

Built-in Supabase email is limited to a small number of messages per hour. For production:

1. **Authentication → Emails → SMTP**
2. Use Resend (or another provider) with a verified `@eventmanager.no` sender.
3. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

With custom SMTP you can raise **Authentication → Rate Limits → Email sent** (default 30/hour).

### Password reset email template (PKCE)

Update the **Reset password** template so links use token hash:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/login">
  Nullstill passord
</a>
```

## Verifying registration

```bash
npm run typecheck
npm test
```

Manual:

1. Register with a custom-domain email → lands on `/app/onboarding` without “check your inbox”.
2. Forgot password → email link opens `/auth/confirm` → redirects to login.
3. Duplicate email → Norwegian message to log in instead of raw English error.

## If a specific domain still fails

1. Confirm MX records exist: `dig MX customer-domain.no`
2. Ask customer to re-type email (no trailing spaces; avoid copy/paste from Word).
3. Check Supabase Auth logs for `invalid_email_dns` or `email_address_not_authorized`.
