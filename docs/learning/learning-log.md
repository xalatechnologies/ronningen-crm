# Learning log

Newest entries first. One entry per meaningful change or topic. No secrets or real customer data.

## 2026-11-24: 3D tour of the app on the landing page (three.js)

What we did: a new landing section, "Følg én booking gjennom hele appen", after "Slik fungerer det". Five app screens (inquiries, calendar, invoices, dashboard, customer portal) float in 3D and the camera follows one wedding booking from screen to screen. Each screen has a small moment: the inquiry slides in, the date lands in the calendar, the deposit turns from Sendt to Betalt, the dashboard counts up, the portal cards rise.

Connected parts: `page.tsx` -> `Tour3dSection` (React: step, pause, captions, step buttons) -> `useTourEngine` (loads three.js with `import()` only when the section is near the screen, frees GPU memory on unmount) -> `tour-scene.ts` (camera, loop, clicks) and `tour-scene-objects.ts` (panels, path, shadows) -> `screens/*` (canvas drawings). Pure parts with tests: `tour-steps.ts`, `tour-layout.ts` (camera framing), `screen-palette.ts` (reads tokens), `screen-types.ts` (formatting via the shared `i18n/formatters`).

Why this way: the screens are drawn on a 2D canvas and used as a texture on a 3D plane, which is cheap and sharp. React owns the state and the timer; the scene only follows it, so the logic is testable without WebGL. Tradeoff: the screens are drawn copies, not the real React components, so a UI change in the app does not update the tour by itself.

Checked: typecheck, lint (0 errors), full suite 1110 tests (25 new), the section in the browser at desktop and phone width, no console errors. Not checked: dark mode, a real low-end phone, Safari, an end-to-end test.

## 2026-11-23: Lokaler page rebuilt and moved to a feature folder

What we did: the venue page now shows one row per venue (name, type badge, address, notes, edit and delete) instead of sparse cards. The page was split into a data file (writes always filtered by organization), a lib file (form mapping and search) and three components. The form dialog resets itself when it opens and blocks double submit.

Connected parts: `lokaler/page.tsx` -> `PropertiesSection` -> `PropertyList` and `PropertyFormDialog` -> `data/properties.ts` -> Supabase (Row Level Security still applies).

Why this way: same pattern as the other pages, so rules are testable without React. Tradeoff: venues are still written from the browser, not a server action; moving them is a later step.

Checked: typecheck, lint, 14 new tests, list and edit dialog in the browser. Not checked: a real save or delete (local data is not written), phone width, dark mode.

## 2026-11-21: Overnatting moved to a feature folder

What we did: same four small steps as before. Step 1 moved the files with no change. Step 2 pulled the pure rules into `lib/reservation-rules.ts` (which months to fetch, which reservations touch a month, counts per status, search and date filters, mapping database rows). Step 3 put the Supabase calls in `data/overnatting.ts`. Step 4 moved the unit dialog and the reservation edit dialog into their own lazy-loaded components; the section went from about 1,300 to about 940 lines. One raw colour in the checkbox became the `accent-success` token (same blue).

Connected parts: `overnatting-page-client` -> `OvernattingSection` -> lazy `UnitDialog`, lazy `ReservationEditDialog`, `AccommodationMonthCalendar`, `DataTable` -> `data/overnatting.ts`, `lib/reservation-rules.ts`.

Why this way: the rules can now be tested without React or a database. Tradeoff / follow-up: the section is still over 300 lines, and unit and reservation writes filter by id only and rely on Row Level Security.

Checked: typecheck, lint (0 errors), 17 new tests (776 total, colour guard passes), the empty page and the unit dialog in the browser. Not checked: the reservation edit dialog on screen (no local reservations) and saving or deleting against a real database.

## 2026-11-23: Organization profile page rebuilt, and saving moved to the server

What we did: the Organisasjon settings page is now section cards with a save bar that appears when something changes (Forkast / Lagre endringer), proper field help and errors linked to the inputs, formats for org number (974 760 673) and bank account (8601.11.17947), a logo field with a live preview and a clear message when the address is not an image, "Kreves for oppsettet" markers, and a leave-page warning for unsaved changes.

The bigger change is how it saves. Before, the browser wrote straight to the `organizations` table and used the organization chosen in a browser store. Now it calls a server action that uses the organization of the signed-in session (never a value from the request), allows only owners and admins, validates with the same schema as the form (check digits for org number and bank account, 4-digit postal code, https logo), and writes only the 13 profile columns.

Why: browser code can be bypassed, and the database rule lets an owner or admin update any column of their organization (including billing fields). A server action cannot fix that rule, but it removes this page as a way to abuse it; the database fix is a separate migration (draft, not applied).

Checked: typecheck, lint, 851 tests (28 new: identifiers, schema, server action, form), security tests, the page in the browser (wrong and right org number, formatting, save bar, discard). Not checked: a real save to the database (the local app uses the old database and real data must not be written), phone width, dark mode.

## 2026-11-23: Settings overview made calmer

What we did: the Innstillinger overview was heavy: a big 100 % block, three stat boxes and nine large cards with chips. It is now: a one-line "setup complete" bar when everything is done (or a compact card with a small ring, a "next step" button and the open steps when something is missing), one compact summary strip (venues, team, plan), and the nine sections as three grouped lists (Virksomheten, Avtaler og betaling, Konto og support). Finished rows show a quiet check mark; only what is missing gets a "Mangler" chip.

Connected parts: `SettingsHub` (groups, summary, rows) -> `SetupProgressCard`. No data or access rules changed; the groups are a constant in the hub, the labels are new dictionary keys.

Why this way: less to read at a glance, and the one thing that needs attention stands out. Tradeoff: the cards' big icons and spacing are gone, so the page is denser.

Checked: typecheck, lint, full suite, security tests, the page in the browser, and the "steps still open" state through a temporary preview page (deleted). Tests for the card were updated to the new layout and a hub test was added. Not checked: phone width, dark mode.

## 2026-11-23: Kundeportal page brought to the level of the other lists

What we did: the staff Kundeportal page (the inbox of customers with a portal) now matches Kunder and Fakturaer: four summary cards (needs you, active portals, needs follow-up, next event with countdown), the shared filter bar, header search, a real table with status pills (Aktiv, Invitert, Utløpt) and icon chips for what waits, paging, a phone layout and better empty and "portal is off" states. The page stays a server component for access control and data; the view is a client component that filters in the browser and keeps the address in sync without asking the server again.

Connected parts: `app/portal/page.tsx` (role check, `listPortalInbox`) -> `PortalInboxView` -> `DataTable`, `StatCard`, `SegmentedFilter`, `StatusBadge`, `ListPagination`. New pure rules in `features/portal-inbox/lib/inbox-view.ts`.

Why this way: version A of the plan, with no new data and no new actions, so access rules and queries are unchanged. Tradeoff: no "last activity" or guest count yet (version B would need extra queries).

Checked: typecheck, lint, 13 new tests (rules and view), full suite, and the page in the browser (cards, filter, search, row click). Not checked: phone width, dark mode, a customer with waiting messages in the browser (covered by a component test).

## 2026-11-21: Setup progress on the settings overview

What we did: the Innstillinger overview now shows how far the organization is set up, as a percentage with a done list and a to-do list (8 equal steps: organization profile, venues, team, rental contract template, subscription, calendar feed, customer portal, logo). Each open step links to the right settings page. The section cards got a "Fullført" or "Mangler" chip. The "Plan" box now shows the plan's display name (Komplett) instead of the raw database value. Only owners and admins see the card; the page reads the extra facts only for them.

Connected parts: `settings/page.tsx` (server: role check, `fetchSetupFacts`, `computeSetupProgress`) -> `SettingsHub` -> `SetupProgressCard`. The rules are one pure function with tests; the reads are one data function that filters every table by the organization id.

Why this way: a pure function can be tested for every case (0 %, 63 %, 100 %, billing-exempt) without a database. Tradeoff: "done" means the thing exists (for example a contract template), not that it is good. The calendar feed is owner-only, so it is read with the existing owner-only helper after the role check.

Checked: typecheck, lint, 808 tests (11 new), the colour guard, and the page in the browser (100 % for the venue's own organization; the feed and the contract template were confirmed on their own pages). Not checked: the in-progress layout in the browser with real data (covered by a component test), phone width, dark mode.

## 2026-11-21: Landing hero as an animated product film

What we did: replaced the static dashboard mock in the landing hero with `HeroFilm`: four short scenes (dashboard, inquiry becomes booking, contract and payment, customer portal) that play by themselves and loop. First version used lookalike mock-ups and did not feel like the product; the second version draws the real components (navy sidebar, StatCard, status pills, booking rows, the berry wedding portal) at their real desktop size inside `ScaledScreen`, which scales the whole screen down to fit. The headline changed to "Fra første henvendelse til kundeportalen." through new keys (`landing.hero.filmHeadline`), so the login page, which still uses the old headline key, is unaffected. The old `hero-dashboard-preview.tsx` was deleted after a repo search showed nothing else used it.

Connected parts: `hero-section` -> `HeroFilm` (timer, pause, step buttons) -> `FilmWindow` (browser frame) -> `ScaledScreen` -> `StaffShell` + `DashboardScene`, `InquiryScene`, `BookingsScene` or `PortalScene`; texts in `landing.heroFilm` (Norwegian and English); keyframes `film-*` in `globals.css`.

Why this way: coded scenes stay sharp, translate, follow design tokens and respect reduced motion; a recorded video would be heavy, fixed-language and quickly out of date. Tradeoff: the scenes are mock-ups with sample data, not a recording of the real app.

The three phones in the landing Kundeportal section were rebuilt the same way (`portal-phones.tsx`): real wedding-theme classes and the real `ScheduleTimeline` and `WishStatusChip` instead of blue lookalikes.

The pricing section was rebuilt too: the single plan got a name ("Komplett", English "Complete"), eight cards say what is included (only features that exist in the app), and the price comes from `BILLING_PLANS.standard.displayPriceNok` instead of a number typed in the component. The plan id in the database stays `standard`; only the display name changed (billing page and landing).

Checked: typecheck, lint, 787 tests (7 new: the clock and the player's autoplay, loop, step click, pause and reduced motion), colour guard, and the film in the browser at desktop and phone width in Norwegian and English. Not checked: a real low-end phone; Safari. Found, not fixed: on a 375px phone the page is 20px wider than the screen because of the "Slutt å drive lokalet…" section, not the film.

## 2026-11-22: Priser moved to a feature folder

What we did: the 900-line Priser component became `src/features/pricing/`. Pure rules went to `lib/` with tests (package tier order, which package is "most popular", building and reading the package description text). Writes went to `data/catalog.ts`. The page was split into a package grid, a service list, a catalog dialog and a lazy-loaded form; the page file is now about 190 lines. The raw colours in the package cards became tokens, so the colour guard baseline for this page dropped to zero.

Connected parts: `pricing-page-client` -> `PricingSection` -> `PackageGrid`, `ServiceList`, `CatalogDialog` -> lazy `CatalogFields` -> `data/catalog.ts`.

Why this way: same approved pattern as Finans, Inventar and Kunder. Tradeoff / follow-up: package and service writes filter by id only and rely on Row Level Security for tenant isolation; adding an `organization_id` filter would be defence in depth but is a behaviour change, so it is left as a separate step.

Checked: typecheck, lint, 13 new unit tests (759 total) and the page in the browser (four package cards with the popular and inactive badges, six services, the lazy edit dialog with its seven points). Not checked: saving or deleting against a real database.

## 2026-11-22: Kunder and Partnere moved to a feature folder

What we did: followed the new engineering guide (plan, approval, small steps, tests after each). Step 1 moved the files with no change (726 tests still passed). Step 2 pulled the pure rules into `lib/` with tests (per-customer totals, search, partner categories, initials). Step 3 added `data/` functions for customer and partner writes. Step 4 split the new-customer dialog and the partner form fields out and made the side panel lazy. `CustomerAvatar` became the shared `InitialsAvatar` because Forespørsler also used it.

Connected parts: `customers-page-client` -> `CustomersSection` -> `DataTable`, `NewCustomerDialog`, lazy `CustomerDrawerBody`, `PartnersPanel` -> `data/customers.ts`, `data/partners.ts`.

Why this way: every write already filtered by `organization_id`; the data functions keep that filter and the tests prove it (a wrong tenant changes nothing). Tradeoff: the data functions receive the organization id from the component, so a caller could pass the wrong one; the database Row Level Security is the real guard.

Checked: typecheck, lint, 20 new unit tests (746 total), and the browser: totals unchanged (87 customers, 27 bookings, 1 283 900 kr), the lazy side panel opens, the new-customer dialog and the partner edit dialog open. Not checked: saving or deleting against a real database.

## 2026-11-22: Inventar moved to a feature folder

What we did: the 1,100-line Inventar component became `src/features/assets/`: `lib/` (totals and counts, filtering, insurance and condition styling, CSV), `data/` (create, update, delete), a lazy-loaded form, a KPI summary and the page (about 570 lines). The totals and the filter rule are now plain functions with tests.

Connected parts: `assets-page-client` -> `AssetsSection` -> `AssetsKpiSummary`, `DataTable`, `SegmentedFilter`, lazy `AssetForm` -> `data/assets.ts`.

Why this way: same pattern as Finans, so the next developer finds the same layout. Tradeoff: the page still holds filter state and the delete dialog; those can move to a `useAssetsList` hook if the page grows.

Checked: typecheck, 16 new unit tests, the full suite, and the page in the browser (totals unchanged, condition filter, row click opens the lazy edit dialog). Not checked: saving or deleting against a real database.

## 2026-11-22: First feature folder (Finans) and architecture rules

What we did: moved Finans from one 1,300-line component into `src/features/finance/` with `lib/` (period maths, CSV, category rules), `data/` (create, update, delete), and smaller components (filters, KPI cards, form, section). The form is loaded only when a dialog opens. Rules for the structure are in `docs/architecture/feature-structure.md`.

Connected parts: `finance-page-client` (dynamic import) -> `FinanceSection` -> `FinanceFilters`, `FinanceKpis`, `DataTable`, lazy `TransactionForm` -> `data/transactions.ts` (receives the Supabase client) ; `fetch-finance.ts` still does the read.

Why this way: pure functions and a data layer can be tested without a browser or a database, and a small file is easier to review. Tradeoff: more files and more imports; the pattern only pays off if the other features follow it.

Checked: typecheck, 15 new unit tests (period maths, CSV, category styling, payload mapping, data functions with a fake client), full suite, and the Finans page in the browser (filters, this-month, reset, the lazy add dialog). Not checked: saving a transaction against a real database. Not done: server-side paging of the transaction list (it still loads up to five years).

## 2026-11-21: Shared table, pagination and a safer class merge

What we did: five list pages had their own copy of the table scaffolding and seven had their own pagination footer. They now use `DataTable` and `ListPagination` (`src/components/ui/`). A code review also found that `cn()` dropped our `text-app-*` font sizes whenever a text colour was merged in; `cn()` now knows those sizes. Page state, filters, data loading and handlers stayed in each page.

Connected parts: `DataTable` (columns + rows + optional phone list) <- Kunder, Partnere, Finans, Inventar, Overnatting (`buildReservationColumns`); `ListPagination` <- seven pages; `cn()` in `src/lib/utils.ts` -> every component with Tailwind classes. Rows that hold their own buttons are not extra tab stops.

Why this way: sharing only the scaffolding (not the cell content) keeps each page's behaviour and lets us delete duplicated code without a risky rewrite. Tradeoff: three list pages with custom row layouts (Reservasjoner, Forespørsler, Fakturaer) still have their own markup.

Checked: typecheck, tests for `DataTable`, `ListPagination`, `cn()` and the Overnatting columns, and a font-size comparison of fourteen pages before and after the `cn()` change (only a few texts changed by 1 to 2px, all toward the size the code asked for: pagination, filter counts, card captions). Not checked: Overnatting with real reservations (the local database has none), dark mode on every page.

## 2026-11-20: Design system, brand palette and shared UI pieces

What we did: applied one visual standard across the staff app (`docs/design/`). New brand-blue palette in `src/styles/tokens.css` (light and dark), status colours as `--status-*` tokens, and shared components: `StatusBadge`, `StatCard`, `SegmentedFilter`, `ViewSwitch`. Eleven pages were redesigned (Overnatting, Kunder, Priser, Forespørsler, Finans, Fakturaer, Inventar, Rapporter and others). A guard test (`src/lib/design/raw-colors.test.ts`) fails when a file gets more raw colour values than its recorded baseline.

Connected parts: tokens -> Tailwind theme in `globals.css` (including a `@theme` block that maps the old emerald/amber/red/blue/zinc scales to the palette) -> components -> pages. `bg-success` means "brand blue" for historical reasons; use the `status-*` classes for success, warning and danger meaning.

Why this way: changing tokens and shared components reaches every page at once, so the app stays consistent. Tradeoff: the palette override hides what a class means, and about 380 raw colour values remain in the landing page and login.

Checked: typecheck, unit tests, and browser checks at desktop and phone width. Not checked: every state in dark mode, error and offline states, the customer portal (keeps its own wedding palette).

## 2026-11-20: Dashboard revenue chart shows the last 12 months

What we did: the staff dashboard chart showed one calendar year at a time, so a year with one billed month looked empty. It now shows a rolling window of the last 12 months (e.g. Des 2025 - Nov 2026). The year picker was removed.

Connected parts: `fetchDashboardHome` (per-year series `monthlyByYear`) -> `buildRollingMonths` in `src/lib/dashboard-metrics.ts` -> `DashboardHome` chart. Titles and aria text use the new `{range}` placeholder in the Norwegian and English dictionaries.

Checked: typecheck, lint, 3 new unit tests (year boundary, per-year lookup, missing year), and the page in the browser against the old dev database. Not checked: production data, other languages beyond nb/en, the reports page (separate chart, unchanged).

Concepts to revisit: derived data in a pure function vs inside a component; why the window is computed from the current date (non-deterministic) and how tests inject `now`.

## 2026-11-17: First project study (no application code changed)

What we did: read the stack, routes, migrations, CI and one full flow. Created `project-map.md`, this log and `interview-practice.md`. Added teaching rules to `CLAUDE.md`.

Connected parts: middleware -> staff page (server) -> `NewBookingForm` (browser) -> `createBookingAtomic` -> SQL `create_booking_atomic` -> Postgres constraints.

Checked: file reading only. Nothing run. The SQL function body was read only up to its start and the duplicate check; the customer and inquiry steps are described from the function's declarations and calls, not read line by line.

Concepts to revisit: Row Level Security vs column-level grants; idempotency with `client_request_id`; exclusion constraints; server vs client components; why the browser can call the database directly.

## 2026-11-15/16: Database moved from Supabase cloud to a self-hosted Supabase (before this study)

Source: project memory, not code. Production data moved to a VPS (Hostinger server). Lesson: a permission reset (`REVOKE ALL`) also wiped column-level grants, which showed up as HTTP 403 on `portal_accounts`. Fixed by re-applying the 12 grants from `supabase/migrations`. Verified afterwards by checking allowed and denied columns.
Concepts: ACL (access control list), role (`anon`, `authenticated`, `service_role`), why `has_table_privilege` cannot see column grants, backups and rollback.
Interview angle: a real debugging story, "an access regression after a database migration and how we found it in gateway logs".
Note: only describe your own part in interviews as far as it is true.

## Concepts to revisit

- [ ] RLS policy vs column grant vs `security invoker`
- [ ] Idempotency and retries
- [ ] Webhooks vs API calls
- [ ] Transactions and exclusion constraints
- [ ] Next.js server components, caching and TanStack Query invalidation
