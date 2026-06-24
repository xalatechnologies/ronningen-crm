# Performance smoke test checklist

Run after performance-related changes. No visual or copy changes expected.

## Public & auth

- [ ] Landing page (`/`) loads without console errors
- [ ] Login works (`/auth/login`)
- [ ] Register / forgot-password pages load
- [ ] Theme toggle works on public pages

## Tenant app (`/app`)

- [ ] Dashboard loads — KPIs, chart, alerts, upcoming events
- [ ] Bookings list and calendar views work
- [ ] Booking detail sheet: save, inkasso mark, delete
- [ ] New booking form submits
- [ ] Inquiries list loads; detail sheet works
- [ ] Customers list paginates; drawer edit/notes/delete
- [ ] Partners panel CRUD
- [ ] Finance list filters by date/property; add/edit/delete transaction
- [ ] Pricing packages/services CRUD
- [ ] Invoices list; mark paid updates list without full page reload
- [ ] Assets list paginates; CRUD works
- [ ] Overnatting calendar and reservations
- [ ] Reports year/month filter updates data
- [ ] Settings: account, organization, team, billing, lokaler, support
- [ ] Billing checkout/portal buttons (if configured)
- [ ] Organization switcher changes data
- [ ] Notifications bell and inbox

## Admin (`/admin`)

- [ ] Admin dashboard loads
- [ ] Organizations list loads
- [ ] Users, subscriptions, revenue pages load
- [ ] Audit log paginates
- [ ] Feature flags, support, notifications workspaces load

## Technical

- [ ] No hydration warnings in console
- [ ] No broken layouts (sidebar, header, tables)
- [ ] No React Query stale data after mutations (bookings, customers, invoices)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
