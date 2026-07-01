# Localization manual checklist

Run before merging or deploying localization changes.

## Automated

```bash
npm run typecheck
npm run lint
npm run build
npm run i18n:audit
```

All commands must pass. `i18n:audit` may report allowlisted files; fix any new hits in UI components.

## Language switcher

- [ ] Switch to English on `/` — landing copy updates
- [ ] Switch to Norwegian — copy returns to nb
- [ ] Refresh page — language persists (cookie)
- [ ] `document.documentElement.lang` matches selection

## Smoke pages (nb + en)

| Page | nb | en |
|------|----|----|
| `/` | [ ] | [ ] |
| `/auth/login` | [ ] | [ ] |
| `/app/dashboard` | [ ] | [ ] |
| `/app/bookings` | [ ] | [ ] |
| `/app/invoices` | [ ] | [ ] |
| `/app/settings` | [ ] | [ ] |
| `/admin` | [ ] | [ ] |
| `/admin/organizations` | [ ] | [ ] |

## Forms & validation

- [ ] Login form errors in both languages
- [ ] Register form errors in both languages
- [ ] New booking form — submit with empty required fields — messages match locale

## Formatting

- [ ] Dates formatted per locale on dashboard / bookings
- [ ] Currency (NOK) uses locale-appropriate separators in en

## Invoice print

- [ ] `/app/invoices/print/[bookingId]` — labels match cookie locale on first paint

## Regression

- [ ] No route path changes (`/app/...` only)
- [ ] Stripe / subscription statuses still store English DB values
- [ ] No layout or sidebar regressions

## Platform admin (nb + en)

Automated gates (must pass):

```bash
npm run typecheck
npm run i18n:audit
node scripts/i18n-audit.mjs --path src/components/admin
node scripts/i18n-audit.mjs --path src/app/admin
npm run build
```

### Sidebar routes

| Route | nb | en |
|-------|----|----|
| `/admin` (overview) | [x] | [x] |
| `/admin/organizations` | [x] | [x] |
| `/admin/subscriptions` | [x] | [x] |
| `/admin/users` | [x] | [x] |
| `/admin/revenue` | [x] | [x] |
| `/admin/support` | [x] | [x] |
| `/admin/system-health` | [x] | [x] |
| `/admin/audit` | [x] | [x] |
| `/admin/feature-flags` | [x] | [x] |
| `/admin/notifications` | [x] | [x] |
| `/admin/settings` | [x] | [x] |

### Detail drill-down

| Surface | nb | en |
|---------|----|----|
| `/admin/organizations/[id]` — all tabs | [x] | [x] |
| `/admin/users/[id]` — all tabs | [x] | [x] |
| Impersonation banner | [x] | [x] |
| Suspend / extend-trial dialogs | [x] | [x] |
| Password-reset copy dialog | [x] | [x] |
| Support create-ticket form | [x] | [x] |
| Feature-flag detail panel | [x] | [x] |
| Settings → integrations / environment | [x] | [x] |

### Checks per route

- [x] Page title and KPI labels use `t()` / `adminLabels`
- [x] Table headers and field labels (`dt` / `th` / `Label`) localized
- [x] Empty states, filters, dialogs, and toasts localized
- [x] Overview RSC dates use `getDateFnsLocale(locale)` (not hardcoded `nb`)
- [x] English dictionary (`adminEn`) polished for keys used in admin UI
