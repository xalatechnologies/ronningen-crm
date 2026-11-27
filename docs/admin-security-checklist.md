# Admin Security Checklist

## Access control

- [ ] Non-platform user visiting `/admin` → redirected (middleware RPC + layout)
- [ ] Each admin server action calls `requirePlatformAdmin()`
- [ ] Admin client components do not embed service role key

## Impersonation

- [ ] Only platform admin can set `platform_impersonation_org_id` cookie
- [ ] Cookie is httpOnly, short TTL (1h)
- [ ] Impersonation ends cleanly; audit log entry if applicable

## Destructive actions

- [ ] Delete organization requires confirmation in UI
- [ ] Suspend/unsuspend audited
- [ ] Billing exempt toggle audited
- [ ] Role changes audited

## Data exposure

- [ ] Admin tables paginated or filtered (not unbounded production dump in browser)
- [ ] CSV exports server-generated with admin check
- [ ] User PII not logged to console in production

## Tests

```bash
npm run test:security
# includes require-platform-admin.test.ts
```

## Manual

1. Log in as regular tenant owner → `/admin` → redirect away.
2. Log in as platform admin → `/admin` loads.
3. Start impersonation → tenant app shows target org only.
