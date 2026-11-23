# Feature structure and rules

How code is organised in this app. Finans (`src/features/finance`) is the first feature moved to this shape; other features follow one at a time.

## Layout

```
src/
  app/                    Routes only: thin pages that render a page-client from components/app-pages
  components/ui/          Shared, feature-free UI: Button, DataTable, ListPagination, StatCard, StatusBadge, SegmentedFilter, ViewSwitch
  components/layout/      App shell: sidebar, header, page header
  features/<name>/
    components/           Screens and parts of that feature (section, filters, kpis, forms, dialogs)
    data/                 Database writes for the feature (create / update / delete). No React.
    lib/                  Pure functions (maths, formatting, csv, category rules). No React, no Supabase.
    hooks/                React hooks of the feature (for example the tab state)
    types.ts              Types shared inside the feature
  lib/queries/            Page reads (fetch-*.ts) used by React Query hooks
  hooks/, providers/      App-wide hooks and providers
  styles/tokens.css       Design tokens (colours, status colours, sidebar)
```

## Rules

1. **A component file stays under about 500 lines.** If it grows, split by role: filters, KPIs, table, form, dialog.
2. **Components do not talk to Supabase directly.** Reads live in `lib/queries/fetch-*.ts`; writes live in `features/<name>/data/*.ts` and receive the client as an argument so they can be tested with a fake client.
3. **Business rules are pure functions in `lib/`** and have unit tests (`*.test.ts` next to the file). Examples: period maths, CSV building, category styling, payload mapping.
4. **Shared UI knows nothing about a feature.** If two features need it, it goes to `components/ui/`. Features never import from each other; they import from `components/ui/`, `lib/` and `hooks/`.
5. **Heavy, rarely used UI is loaded lazily** with `next/dynamic` (dialogs, forms, charts, editors). The first paint should not pay for code behind a button.
6. **Colours come from tokens or status classes.** No new raw colour values (a test enforces this). Use `StatusBadge` and `status-*` classes for success, warning and danger.
7. **Every feature change keeps tenant isolation:** queries filter by `organization_id`, and writes attach it. Database access is covered by Row Level Security; do not rely on the client alone.
8. **New shared pieces get a test and a line in `docs/design/project-profile.md`.**

## Performance rules

- Fetch only what the screen shows. Today the Finans page loads up to five years of transactions on the client; large organisations will need server-side paging or a date-range query (backlog).
- Keep list pages at 10 to 20 rows per page (`ListPagination`, `usePagedList`).
- Derive values with `useMemo` only when the work is real; do not memoize cheap code.
- Never import a whole icon or date library for one function; import by name.
- Measure before and after (`docs/performance-plan.md` has the plan and the measurements).

## Status of the migration

| Feature | Status |
|---|---|
| Finance | Moved to `src/features/finance`: lib (3 files, tested), data (tested), form, filters, KPIs, section. Form is lazy-loaded. |
| Assets (Inventar) | Moved to `src/features/assets`: lib (stats, filter, presentation, CSV; tested), data (create, update, delete; tested), form (lazy), KPI summary, section. |
| Customers (Kunder and Partnere) | Moved to `src/features/customers`: lib (stats, search, partner categories, initials; tested), data (customer and partner writes, always scoped to the organization; tested), side panel lazy-loaded, new-customer dialog and partner fields split out. `src/lib/customers/*` (identity, merge, delete) stays shared. |
| Pricing (Priser) | Moved to `src/features/pricing`: lib (package tiers and popular pick, description builder; tested), data (create, update, delete for packages and services; tested), package grid, service list, catalog dialog with lazy form. The writes filter by id only and rely on Row Level Security (unchanged). |
| Overnatting | Moved to `src/features/overnatting`: lib (month window, in-month filter, status counts, search and date filters, row mapping, quick stats; tested), data (read of reservations in a window with an organization filter, unit and reservation writes; tested with a fake client), unit dialog and reservation edit dialog as lazy components, month calendar, columns. The section is still about 940 lines (calendar, filters and unit panel remain inside). Writes filter by id only and rely on Row Level Security (unchanged). |
| Settings (setup progress) | New in `src/features/settings`: lib (`computeSetupProgress`, the 8-step checklist and percentage; tested), data (`fetchSetupFacts`, organization-scoped reads; tested with a fake client), components (`SetupProgressCard`). The settings hub itself is still in `src/components/settings`. |
| Portal inbox (staff Kundeportal page) | New in `src/features/portal-inbox`: lib (`daysUntil`, countdown, summary, search; tested), components (`PortalInboxView`: summary cards, filter bar, search, table, paging; component-tested). The data read (`src/lib/portal/inbox.ts`) and the filter rules (`inbox-rules.ts`) stay where they are. |
| Organization profile (Organisasjon settings page) | New in `src/features/organization-profile`: components (form with a save bar that appears on changes, field with linked hint/error, logo field with live preview, invoice preview, address fields; component-tested). Saving goes through the server action `lib/organizations/actions/update-organization-profile.ts` (session organization, owner/admin only, server-side validation, profile columns only; tested). The format and check-digit rules for org number, bank account and postal code live in `lib/organizations/identifiers.ts` (tested) and are part of `organizationProfileFormSchema`. |
| Properties (Lokaler settings page) | Moved to `src/features/properties`: lib (form/row mapping, payload with empty text as null, search match; tested), data (create, update, delete, every write filtered by `organization_id`; reports a venue still in use; tested with a fake client), components (`PropertiesSection`, `PropertyList` rows, `PropertyFormDialog`; list tested). `PropertySelectField` and the row type stay in `src/components/properties` because six other features import them. |
| Team (Team settings page) | New in `src/features/team`: lib (`TeamMemberRow`, display name, per-row actions, refusal rules for role change and removal; tested), components (invite form, member list, pending invitations, roles guide, and the section that holds the handlers; member list tested). Role changes and removals are still written from the browser; the database trigger `trg_enforce_member_hierarchy` is the server-side guard. |
| Activity log (Aktivitetslogg) | New in `src/features/activity-log`: lib (address-bar parsing for page, type and action filters, links, entry range, grouping by Oslo calendar day with today/yesterday; tested), components (filter bar, day-grouped timeline; timeline tested). Reads `audit_log` filtered by organization, type and action (INSERT/UPDATE/DELETE). `components/audit/audit-entry-details` and `lib/audit` stay shared. |
| Bookings, Inquiries, Invoices, Reports | Still in `src/components/<name>/`. Next in order: Invoices. |
| Supabase calls inside components | Finance, Assets, Customers, Pricing and Overnatting writes moved to `data/`. Others still call Supabase in the component (backlog per feature). |
