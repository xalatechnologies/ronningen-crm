# Project profile and rollout: Event Manager / Rønningen Selskapslokale

Applies the standard in [visual-language.md](./visual-language.md) to the whole product, not only the customer portal.
Written 2026-11-20. Items marked *(assumed)* were not verified against code or confirmed by the owner yet.

## Profile

| Decision | Record |
|---|---|
| Product and audience | Venue-booking CRM. Staff app (`/app/*`), platform admin (`/admin/*`), customer portal (`/portal/*`), auth pages, landing page. Norwegian-first venue staff and their customers. |
| Brand character | *(assumed, confirm with owner)* calm, trustworthy, calm and trustworthy, now brand blue on navy with a warm canvas; the portal adds a romantic wedding expression. |
| Colour | Tokens in `src/styles/tokens.css` (`--rn-*` plus shadcn names such as `--background`, `--card`, `--primary`). Palette adopted 2026-11-20: brand blue (`brand-600 #3d62cf` primary action, `#2f51b8` hover, `#26439a` pressed, `#eef2fd` tint), navy text `#13233a`, warm canvas `#f7f6f2`, navy sidebar `#11233a` (active `#1b3556`), border `#e7e7e3`, status green/amber/red/blue from the supplied status set. Dark theme: canvas `#0e1520`, surface `#172130`, accent text `#93acff`. `--rn-success` / `bg-success` is the **primary action colour (brand blue)**, not a status colour; kept under that name so existing classes keep working. The customer portal keeps its own wedding palette in `wedding-portal.css`. |
| Typography | `--font-sans` for UI and headings; `--font-serif` only in the portal. Type scale via `text-app-*` utilities and `--app-type-scale`. |
| Shape and depth | `--radius-*` and `--app-radius`; cards use `ring-1 ring-foreground/8`; shadows are light (`--rn-shadow-card`). |
| Density | `src/styles/display-density.css` sets tap-target and control heights (44px comfortable, 40px compact). |
| Themes | Light and dark via `data-theme`. Portal theme is scoped to `.wedding-portal` (`src/styles/wedding-portal.css`). |
| Platforms | Evergreen browsers and an installable PWA. *(assumed)* |
| Accessibility | Target WCAG 2.2 AA. *(assumed, not formally recorded before today)* |
| Internationalization | Norwegian (nb) and English; keys in `src/i18n/dictionaries`. NOK currency. No RTL. |
| Implementation | Next.js App Router, Tailwind v4, shadcn / base-ui primitives in `src/components/ui`, vitest. |
| Ownership | Product owner decides visual direction; changes reviewed against section 16 of the standard. |

## Applied globally on 2026-11-20 (verified: tsc, 676 tests)

| Standard rule | Change | Where |
|---|---|---|
| 7: reduced motion | Global `prefers-reduced-motion` rule removes decorative animation and transitions everywhere | `src/app/globals.css` (end of file) |
| 6: forced colours | Visible focus ring and control borders in forced-colour mode | `src/app/globals.css` (end of file) |
| 9.1: skip link, landmarks | "Hopp til hovedinnhold" link and `id="main-content"` on the staff app and admin shells | `src/components/layout/skip-link.tsx`, `protected-layout.tsx`, `src/app/admin/layout.tsx` |

Also applied app-wide on 2026-11-20:

| Shared piece | Change | Effect |
|---|---|---|
| `src/lib/table-typography.ts` | Tighter cell padding (`px-4 py-3.5 sm:px-6`), lighter header bar (`bg-muted/50`, thin border, muted text) | Every table that uses the shared constants: Bookings, Inquiries, Invoices, Inventory, Finance, Reports, Admin lists |
| `src/components/ui/segmented-filter.tsx` (new) | One grey bar with a white selected segment, counts and optional status dot | Status filters on Overnatting, Reservasjoner and Fakturaer (replaces three different big-button filters) |

Not yet added: skip link in the portal shell and auth pages.

## Already aligned (before today, from code reading)

- Semantic tokens exist (`--rn-*`, shadcn mapping) and are used by most components.
- Shared buttons and inputs have a focus ring, `aria-invalid` styling and tap-target minimums (`button.tsx`, `input.tsx`).
- Confirm dialogs for destructive actions; toasts auto-dismiss at 2.2 s (portal feedback).

## Open gaps found in the audit (not fixed yet)

1. **Raw colour values in components** (rule 3): for example `bg-[#1a4331]` and `text-[#85b098]` in the Priser cards. They should use `bg-success` and a token for the light green. Needs a repo-wide scan, then a ratchet baseline (rule 13).
2. **Small controls:** `Button` sizes `xs`, `sm`, `icon-xs`, `icon-sm` are 24-28px. They meet the WCAG 24px minimum but not the 44px touch preference. Check where they are the only target on touch screens.
3. **Status by colour alone** (rule 6): some list pills and dots rely on colour. Verify each has a text label (Overnatting and Kunder do).
4. **Tooltips and `title` attributes** carry the only explanation for disabled actions on several pages (rule 9.2). Add adjacent text.
5. **Charts** need a text/value alternative and a missing-data state (rule 9.12). The dashboard and admin trend charts are the first candidates.
6. **Contrast of `text-white/55` and `text-muted-foreground` on tinted surfaces** has not been measured (rule 11).
7. **Page-level state coverage** (rule 8): partial failure, offline and expired-session behaviour has not been reviewed per screen.
8. **Print/export** layouts (invoices, contracts) are unreviewed.

## Rollout status by surface

| Surface | Status |
|---|---|
| Customer portal | Restyled earlier (wedding look), reviewed for mobile feel. Needs skip link and the open gaps above. |
| Staff: Overnatting | Redesigned and released 2026-11-20. |
| Staff: Kunder and Partnere | Redesigned and released 2026-11-20. |
| Staff: Priser | Redesigned and released 2026-11-20. |
| Staff: Dashboard | 12-month chart implemented, **not released**. |
| Staff: Bookings, Invoices | Shared table and status-filter changes applied. Invoices list is still a wide table on phones (scrolls inside its own region); a card layout is the next step. |
| Staff: Inquiries, Inventory, Finance, Reports, Settings | Screenshot-checked at desktop width after the shared table change; look consistent. Phone view and difficult states not reviewed. |
| Staff: Calendar, Notifications, Onboarding | Not reviewed against the standard. |
| Platform admin | Footer copyright removed; rest not reviewed. Has uncommitted work from earlier. |
| Auth pages, landing page | Not reviewed. |

## Next steps (suggested order)

1. Staff list pages that share the Overnatting/Kunder pattern: Bookings, Inquiries, Invoices, Inventory.
2. Finance and Reports (charts and dense tables, rules 9.8 and 9.12).
3. Settings and Onboarding (forms, rule 9.3).
4. Admin pages and auth.
5. Add a token-use check with a baseline (rule 13) so new raw colours fail review.

## Exceptions

None recorded. The portal wedding theme is a brand expression layered on the same tokens and rules, not an exception.

## Palette change, 2026-11-20

Replaced the forest-green palette with the supplied brand-blue / navy / warm-canvas palette.

- `src/styles/tokens.css` rewritten for light and dark themes.
- About 185 hard-coded green hex values across the landing page, login, sidebars, charts, pricing, dashboard and e-mail templates mapped to the new palette (`#1a4331` to `#3d62cf`, `#0c1f16` to `#13233a`, `#002d1c` to `#11233a`, light greens to `#eef2fd` / `#c9d6f7` / `#93acff`).
- PWA `theme_color` / `background_color` and the offline page set to the canvas `#f7f6f2`.
- Not changed: logo and app icon image files in `public/` and `src/app/*.png` (still the old artwork), the portal wedding palette, status colours that use Tailwind emerald/amber/red classes.
- Known follow-ups: check text contrast of `text-success` (now blue) on tinted surfaces and in dark mode; replace the remaining raw hex values with tokens; recolour the logo and icons if the new brand should change them too.

## Status and neutral colours, 2026-11-20

`src/app/globals.css` now has a `@theme` block that overrides the default Tailwind scales, so every existing class resolves to the design-system set without editing each component:

| Meaning | Tailwind families remapped | Anchors (50 / 200 / 700 or 800 / 500-600) |
|---|---|---|
| Success | emerald, green, teal, lime | `#eaf5ef` / `#b7dcc9` / `#226b59` / `#2f8a68` |
| Warning | amber, yellow, orange | `#fcf3e4` / `#f0d3a3` / `#855a26` / `#c98a2e` |
| Danger | red, rose, pink | `#fdecee` / `#f2b8bf` / `#ad3d49` (600) |
| Info and brand | blue, sky, indigo, cyan | `#eef2fd` / `#c9d6f7` / `#2f51b8` / `#3d62cf` |
| Neutral | zinc, slate, gray, stone, neutral | `#fbfaf7` ... `#13233a` |

Not remapped: `violet` (used for the inkasso status), `fuchsia`, `purple`. Chart colours in `src/lib/charts/chart-theme.ts` use the same status set. Prefer these families (or the `--rn-*` tokens) for new status UI; do not add raw hex values.
