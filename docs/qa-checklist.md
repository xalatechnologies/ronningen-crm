# QA Manual Checklist

Pre-release regression (complement to automated tests).

## Auth

- [ ] Login / logout
- [ ] Register new user (dev only)
- [ ] Forgot password email flow
- [ ] Session persists across refresh

## Tenant app

- [ ] Dashboard loads KPIs
- [ ] Create inquiry → booking flow
- [ ] Create customer, booking, transaction
- [ ] Reports year/month picker
- [ ] Settings save (org profile, team)
- [ ] Language + theme switch

## Billing

- [ ] Suspended org → `/app/suspended`
- [ ] Trial expired → billing-only paths
- [ ] Billing exempt org has full access

## Admin

- [ ] Organization list and detail
- [ ] Audit log loads
- [ ] Feature flags toggle (dev)

## Print / export

- [ ] Invoice print page
- [ ] Finance CSV export (tenant scoped)

## Commands before release

```bash
npm run typecheck
npm run lint
npm run build
npm run test:unit
```
