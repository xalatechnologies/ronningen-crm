# RLS Security Checklist

Manual verification after running `node scripts/security/rls-audit.mjs`.

## Migration audit

- [ ] All tenant-owned tables have `ENABLE ROW LEVEL SECURITY`
- [ ] Each RLS-enabled table has at least one `CREATE POLICY`
- [ ] `organization_id` column exists on tenant data tables
- [ ] Helper functions: `user_organization_ids()`, `is_org_member()`, `has_org_role()`

## Read policies

- [ ] Authenticated user can only `SELECT` rows for organizations they belong to
- [ ] Viewer role cannot `INSERT`/`UPDATE`/`DELETE` on bookings, finance, customers
- [ ] Cross-org read returns empty (not error) for anon/authenticated client

## Write policies

- [ ] User cannot `INSERT` with another organization's `organization_id`
- [ ] User cannot `UPDATE` row to change `organization_id` to foreign org
- [ ] Manager cannot write finance if policy restricts accountant/owner/admin only
- [ ] Accountant cannot write bookings if policy restricts manager+ only

## Service role

- [ ] `SUPABASE_SERVICE_ROLE_KEY` used only in server modules (`server-only` or API routes)
- [ ] No service role in client bundle (`grep -r SERVICE_ROLE src/components`)
- [ ] Webhook/cron/admin paths use service role intentionally

## Platform admin

- [ ] `is_current_user_platform_admin()` is security definer, self-only read
- [ ] Admin UI uses service role server-side, not client-side bypass of RLS

## Stripe / billing tables

- [ ] `stripe_webhook_events` has RLS enabled, no client policies
- [ ] `subscriptions` readable only within org membership

## Sign-off

| Reviewer | Date | Notes |
|----------|------|-------|
| | | |
