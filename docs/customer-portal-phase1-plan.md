# Customer portal — Phase 1 plan: venue ↔ customer loop

Status: **PROPOSAL — nothing built.** Builds on Phase 0 (commit `9c31532`): `portal_accounts`,
`portal_booking_ids()`, `getPortalContext()`, `/portal` shell, `portal_enabled` switch.
Same rule as before: purely additive, flag-gated, one booking = one isolated world.

Scope: **messages**, **wishlist with quotes and approval**, **day plan shared as versions**,
notifications both ways. (Guests/invitations are Phase 2; invoicing of approved extras is 2b.)

---

## 1. Delivery in three shippable slices

| Slice | Scope | Why this order |
|---|---|---|
| **1a Messages** | `portal_messages`, customer chat page, staff booking-portal page (new), notifications, unread counts | Smallest slice; proves the new staff page, the notification wiring and the RLS pattern all later tables reuse |
| **1b Wishlist & quotes** | wish items, quotes, counter-offers, state machine, approve/decline/counter, e-mail to customer | Core business value |
| **1c Day plan** | schedule items, shared versions, venue acknowledge | Independent of 1b; reuses the page shell |

One migration per slice; each slice ends with the isolation checklist run against the live DB with test
data (the same scripted method as Phase 0, cleaned up afterwards).

---

## 2. Data model

All tables: `organization_id`, `booking_id`, composite FK `(organization_id, booking_id) → bookings`,
audit triggers (existing `tenant_audit_log` pattern), idempotent migration, "NOT APPLIED automatically".

### 2.1 Messages (1a)
`portal_messages(id, organization_id, booking_id, sender_kind 'customer'|'staff', sender_user_id,
body text 1..4000, wish_item_id null, created_at, read_by_customer_at, read_by_staff_at)`

- Append-only: no edit, no delete (disputes, audit).
- Customer RLS: select/insert for bookings in `portal_booking_ids()`, insert only with
  `sender_kind='customer'` and `sender_user_id = auth.uid()`.
- Staff RLS: select `is_org_member`; insert `sender_kind='staff'`, own user id, role owner/admin/manager.
- "Read" flags are set by a server action (authorized, service role), not by client updates.
- Plain text only; rendered as text, never as HTML.

### 2.2 Wishlist (1b)
`portal_wish_items(id, org, booking_id, category, title, description, quantity numeric, unit,
status, revision int default 1, sort_order, created_by, created_at, updated_at)`

- `category` ∈ food, drink, decoration, furniture, av, cleaning, other.
- `status` ∈ draft, requested, quoted, countered, approved, declined, withdrawn, unavailable.

`portal_wish_quotes(id, org, booking_id, wish_item_id, revision, unit_price_nok, total_nok,
vat_included boolean, note, valid_until, status 'active'|'superseded', quoted_by, created_at)`

- **Separate table, written only by staff server actions**: the customer can never write a price, so
  no column-level guards are needed. Customer RLS: select active quotes of own booking only.

`portal_wish_counters(id, org, booking_id, wish_item_id, quote_id, proposed_unit_price_nok, note,
status 'open'|'accepted'|'rejected'|'superseded', created_by, created_at, answered_by, answered_at)`

- The customer's counter-offer is its own table, written only by a server action; a counter is always
  tied to the quote it answers. **A counter never changes a price by itself**: only a staff action turns it
  into a quote. At most **3 counter rounds per item**, then the chat decides (stops endless loops).

**State machine** (every transition runs in a server action that validates it; RLS additionally lets the
customer touch *only draft rows* directly, as defence in depth):

```
draft ──send──▶ requested ──quote──▶ quoted ──approve──▶ approved
  ▲                │  │                │ │ └─decline──▶ declined
  │                │  └─cannot──▶ unavailable
  │                │                   │ └─counter──▶ countered ──staff accepts──▶ approved (at counter price)
  │                │                   │                  │ └─staff re-quotes──▶ quoted (new active quote)
  │                │                   │                  └─staff rejects──▶ quoted (original quote stays)
  └──── edit ◀─────┴──────── edit (revision+1, quote and open counter superseded, back to requested)
requested/quoted/countered ──withdraw──▶ withdrawn
```

- Customer sends all drafts in one action ("Send 3 ønsker til utleier").
- Editing a quoted item invalidates its price: revision +1, old quote `superseded`, status → requested.
- **Counter-offers (decided):** on a quoted item the customer can approve, decline, edit **or counter**
  with a proposed unit price and a note. Accepting a counter creates a new active quote at the counter price
  (marked "Akseptert motforslag") so the audit trail always shows who set which price.
- Approved items are **extras outside the signed contract** (signed contracts stay untouched,
  `protect_signed_contracts`). Shown to staff as "Godkjente tillegg"; adding to the invoice is Phase 2b, manual.

### 2.3 Day plan (1c)
`portal_schedule_items(id, org, booking_id, day_offset int default 0, start_time time, duration_min,
title, note, responsible, created_at, updated_at)` — the customer's working copy.

`portal_schedule_versions(id, org, booking_id, version, items jsonb, content_hash, shared_by,
shared_at, acknowledged_by, acknowledged_at, staff_note)` unique `(booking_id, version)`.

- **Sharing = snapshot**, built server-side from the current items (the client cannot forge it).
- "Changed since shared" = hash of current items ≠ latest version's `content_hash` (no dirty flags).
- Venue sees only shared versions; it can acknowledge and add a note, never edit the customer's plan.

### 2.4 Small additions
- `portal_accounts.last_customer_emailed_at` (throttle for customer e-mails).
- New notification event keys (existing `notification-events.ts` union): `portal.message`,
  `portal.wish_requested`, `portal.wish_answered`, `portal.schedule_shared`.

---

## 3. Notifications

- **Venue staff:** `notifyOrgMembers` (existing bell + e-mail settings) on: customer message, wishes sent,
  quote approved/declined, day plan shared. Action URL → the staff portal page, correct tab.
- **Customer:** e-mail (Resend, existing client, idempotency key) on: venue message, quotes ready,
  item unavailable, plan acknowledged. **Throttled to one e-mail per booking per 15 minutes**
  (`last_customer_emailed_at`) so a chatty venue does not spam.
- In-app unread counts in the portal nav (staff messages not yet read, quotes waiting).

---

## 4. Screens

### Customer (`/portal`, mobile-first, bottom tab bar on phones, top nav on desktop)

| Screen | Content |
|---|---|
| **Oversikt** | Countdown + "Neste steg" cards driven by real state: *Svar på pris på 3 ønsker*, *Ny melding fra utleier*, *Dagsplanen er endret siden sist delt*; otherwise starter prompts. No KPI grid. |
| **Ønskeliste** | Grouped by category. Add via sheet (category chips, title, quantity + unit, note). Row shows a state chip (Utkast · Sendt · Pris mottatt · Godkjent · Avslått · Ikke tilgjengelig). Sticky bar "Send N ønsker til utleier". Quoted row: price, note, valid until, **Godkjenn / Avslå / Foreslå pris** (counter form: price + note; the row then shows *Motforslag sendt*). Footer: total of approved extras, marked "Tillegg utenfor avtalen". |
| **Dagsplan** | Vertical timeline, time inputs, add/remove, "Del med utleier" with a confirm step; status line *Delt v2 · 12. nov 14:03 · Utleier har sett den* or *Endret siden sist delt*. |
| **Meldinger** | One thread per booking, newest at the bottom, date separators, composer; optional "Gjelder ønske: …" link. Refresh on focus/send (realtime later). |

### Venue (`/app/bookings/[bookingId]/portal`, new page next to the existing `/contract` page)

Tabs **Meldinger · Ønsker · Dagsplan**; header shows the customer's account status and a link back to the
booking. The existing "Kundeportal" panel in the booking sheet gains counts ("2 nye ønsker · 1 melding")
and a link. Wishlist tab: table with inline quote form (unit price, note, MVA included, valid until) and "Kan ikke levere"; a countered row shows the proposal with **Godta / Gi nytt pris / Avslå**;
approved items summed under "Godkjente tillegg". Day plan tab: latest shared version as a timeline, version
picker, **Bekreft mottatt** + optional note.

Design rules (taste skill, app screens): calm warm ground from the existing tokens, venue logo/name on top,
one primary action per screen, real content in empty states with one clear next step, 44px tap targets,
visible focus, dark mode defined, NO/EN strings in `parts/portal.ts`, no decorative effects.

---

## 5. Security (all RLS tested as `authenticated`, never service role)

- Customer: only rows whose `booking_id ∈ portal_booking_ids()`; cannot read another booking's messages,
  items, quotes, counters, versions; cannot spoof `sender_kind` or `sender_user_id`; cannot write quotes,
  accept their own counter or write snapshots; cannot change non-draft items directly.
- Staff: only own organization (`is_org_member`); writes require owner/admin/manager; platform-admin
  "view as" works through the existing helpers.
- Server actions derive organization and booking from the session (customer: `getPortalContext()`; staff:
  booking read through RLS + role check). No organization or booking id is trusted from the client.
- Input validation with zod (lengths, enums, price ≥ 0, quantity > 0). Message rate limit, DB-backed
  (≤ 10 per minute per user), because the in-memory limiter does not hold on serverless.
- Text rendered as text; e-mail templates escape all user content.
- Money: NOK `numeric(12,2)`, check constraints (≥ 0), computed totals server-side.

---

## 6. Tests

- Unit: state machine (every allowed and forbidden transition, incl. the 3-counter limit and counter → quote), content hash stability, e-mail throttle, validation.
- RLS checklist added to `docs/tenant-isolation-checklist.md` per slice; run on the live DB with scripted
  test data (customer A/B, staff of two orgs), then cleaned up — as done for Phase 0.
- One Playwright smoke per slice if a safe test environment exists (today there is only a thin smoke suite).

---

## 7. Files (indicative)

Migrations: `2026111x…_portal_messages.sql`, `…_portal_wishlist.sql`, `…_portal_schedule.sql`.
New: `src/lib/portal/{messages,wishlist,schedule}/…` (rules, actions, queries, tests),
`src/app/portal/(app)/{onboarding-cards,wishlist,schedule,messages}/…`,
`src/app/app/bookings/[bookingId]/portal/page.tsx`, `src/components/portal/*`.
Edited: `notification-events.ts`, `booking-portal-panel.tsx`, portal nav in `portal-shell.tsx`, `parts/portal.ts`.

---

## 8. Skipped in Phase 1 (YAGNI)

Attachments and photos · realtime/websockets · per-item chat threads · multi-round negotiation beyond 3 counters ·
price-list/catalogue integration for quotes · PDF export of wishlist or plan · organization-wide inbox page
(notifications + panel counts first) · staff editing the customer's items or plan · VAT breakdown beyond a
"MVA inkludert" flag.

---

## 9. Decisions (all made)

1. **Slice order:** ✅ messages → wishlist → day plan.
2. **Quote prices:** ✅ chosen per quote, default incl. MVA.
3. **Negotiation:** ✅ counter-offers allowed (max 3 rounds per item, staff accepts / re-quotes / rejects).
4. **Customer e-mails:** ✅ throttled, one per booking per 15 minutes.

Next: build slice **1a Messages** on the user's go-ahead.
