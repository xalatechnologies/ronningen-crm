# Localization audit log

Generated during the full bilingual localization rollout (June 2026).

## Infrastructure

- [x] `src/i18n/` — config, types, nb/en dictionaries, server/client providers, formatters
- [x] Cookie `event-manager-locale` + Zustand persist
- [x] Root layout `lang` from server locale
- [x] Middleware sets default locale cookie on first visit
- [x] Language switcher in app + admin headers

## Converted areas

| Area | Status |
|------|--------|
| Navigation (app + admin sidebars, mobile nav) | Done |
| Auth pages + auth error mapper | Done |
| Landing page sections | Done |
| Dashboard | Done |
| Inquiries, bookings, customers | Done |
| Finance, invoices, assets, reports, pricing | Done |
| Overnatting / accommodation | Done |
| Settings hub + pages | Done |
| Admin workspaces | Done |
| Invoice print (RSC) | Done |
| Email templates (locale param) | Done |
| Validation schema factories | Done |
| Label maps (roles, statuses, audit, support, subscriptions) | Done |

## Tooling

- `npm run i18n:audit` — scans for hardcoded Norwegian in `src/` (excludes dictionaries)
- `npm run typecheck`, `npm run lint`, `npm run build`

## Known exceptions

- `src/lib/validations.ts` — Norwegian **preset values** kept for DB compatibility (`Bedrift`, fest types)
- `src/config/routes.ts` / `settings-links.ts` — segment metadata; UI uses `appNavLabel` / `settingsSectionTitle`
- Dictionary files under `src/i18n/dictionaries/` — source of truth for nb copy

Run `npm run i18n:audit` after changes to catch regressions.
