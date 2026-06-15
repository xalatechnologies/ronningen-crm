# Dark mode manual test checklist

Use this checklist after deploying or changing theme tokens.

## Theme toggle

- [ ] Switch to **Lys** — app uses light surfaces
- [ ] Switch to **Mørk** — app uses dark surfaces
- [ ] Switch to **System** — follows OS preference
- [ ] Refresh page — selected theme persists
- [ ] No flash of wrong theme on hard refresh (check `theme-init.js`)
- [ ] Theme toggle in header next to notification bell (tenant + admin)
- [ ] Theme toggle on **Innstillinger → Min konto → Utseende**

## Auth & landing

- [ ] Login page readable in light and dark
- [ ] Register / forgot password readable
- [ ] Landing page shell readable (hero may keep brand contrast)

## Tenant app

- [ ] Dashboard — KPI cards, chart, tables
- [ ] Forespørsler — list, calendar, forms
- [ ] Reservasjoner — list, filters, calendar
- [ ] Overnatting — KPI chips, calendar
- [ ] Kunder / Partnere
- [ ] Priser
- [ ] Finans
- [ ] Fakturaer — workspace, filters, badges
- [ ] Inventar
- [ ] Rapporter — breakdown bars
- [ ] Settings pages

## Admin console

- [ ] Admin dashboard and trend charts
- [ ] Organizations list and detail
- [ ] Users, billing, audit log
- [ ] Platform backoffice modules

## Overlays & inputs

- [ ] Dialogs and confirm delete
- [ ] Sheets (booking detail, mobile nav)
- [ ] Dropdown menus and popovers
- [ ] Select, date/time pickers
- [ ] Form inputs — text, placeholder, disabled, focus ring
- [ ] Toasts (Sonner) match resolved theme

## Charts & status

- [ ] Dashboard revenue bars readable
- [ ] Admin trend chart readable
- [ ] Reports progress bars readable
- [ ] Booking status badges (confirmed / pending / cancelled)
- [ ] Payment and subscription badges

## Billing & print

- [ ] Billing settings page readable
- [ ] Invoice print page stays **light** (white background, dark text) when app is in dark mode

## Mobile & a11y

- [ ] Mobile navigation readable
- [ ] Theme toggle usable on small screens
- [ ] Keyboard focus visible on theme control
- [ ] No solid white cards on dark background in main workflows
- [ ] No black text on dark background
- [ ] No white text on light background (except intentional CTAs on brand colors)

## Regression

- [ ] Light theme matches pre–dark-mode appearance
- [ ] No broken layouts or missing functionality
- [ ] `npm run typecheck`, `lint`, and `build` pass
