# Tenant Isolation Checklist

Verify Org A user cannot access Org B data. Use **dev Supabase only**.

## Prerequisites

- Two test organizations: Org A, Org B
- User Ua member of Org A only
- User Ub member of Org B only
- Optional: User Uab member of both (for switcher test)

## Browser tests

### Organization switcher

1. Log in as Uab.
2. Open org switcher — only memberships listed.
3. Switch to Org A — dashboard KPIs reflect Org A data.
4. Switch to Org B — data changes; no Org A bookings visible.

### Direct URL access

1. Log in as Ua.
2. Copy a booking ID from Org B (from admin or seed).
3. Navigate to `/app/bookings` — Org B booking not in list.
4. Open `/app/invoices/print/{orgB_booking_id}` — expect 404 or redirect, not Org B invoice.

### Impersonation (platform admin)

1. Platform admin starts impersonation for Org A.
2. Tenant app shows Org A data only.
3. End impersonation — returns to admin context.

## SQL tests (Supabase SQL editor, as authenticated user)

Use `set request.jwt.claims` or test via client with user session — **not** service role.

```sql
-- As Ua: should return 0 rows for Org B bookings
SELECT count(*) FROM bookings WHERE organization_id = '<org-b-id>';
```

## API / server actions

- [ ] Checkout session uses caller's org, not body `organizationId` alone
- [ ] Server actions resolve org from session/membership, not client-supplied ID

## React Query

- [ ] Changing org invalidates tenant queries (`tenantQueryKeys` include `orgId`)
- [ ] Stale Org A data not shown after switching to Org B

## Sign-off

| Test | Pass | Notes |
|------|------|-------|
| Switcher lists memberships only | | |
| Cross-org booking invisible | | |
| Invoice print scoped | | |
| SQL count isolation | | |

## Customer portal (Phase 0 — `portal_accounts`)

Run in the Supabase SQL editor as the **authenticated** role (not service role), after applying
`20261112140000_customer_portal_accounts.sql` on staging. Users: `staffA` (member of org A),
`staffB` (member of org B), `custA` (accepted portal account on a booking of org A), `custB` (same, org B).

- [ ] `custA` selects `portal_accounts`: sees only their own row (not `custB`'s, not unaccepted rows of others).
- [ ] `staffA` selects `portal_accounts`: sees only org A rows; `staffB` sees zero org A rows.
- [ ] No client role can select `token_hash` (`select token_hash from portal_accounts` → permission denied).
- [ ] `custA` insert / update / delete on `portal_accounts` → denied (no write policies).
- [ ] `custA` has NO row in `organization_members`; `select * from bookings` as `custA` returns zero rows
      (customers read their booking only through server code with the explicit safe-column list).
- [ ] `custA` sets `profiles.active_organization_id` to org B → `select current_organization_id()` does NOT return org B
      (hardened function; before the migration it did).
- [ ] `select * from portal_booking_ids()` as `custA` returns exactly their booking; as `staffA` returns nothing.
- [ ] Browser: `custA` opening `/app/dashboard` or `/app/onboarding` lands on `/portal`; staff opening `/portal` lands on `/app/dashboard`.
- [ ] Revoked account (`revoked_at` set) → `/portal` no longer resolves a context.
