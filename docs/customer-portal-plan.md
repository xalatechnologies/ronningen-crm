# Customer portal ("Kundeportal") — concept & architecture plan

Status: **PROPOSAL — nothing implemented.** Agree on this document first, then build phase by phase.
Principle: **purely additive.** No existing table, page, RLS policy or data is changed except the
five small hook points listed in section 9.

---

## 1. What we are building

After a booking's contract is signed (**Godkjent**), the customer (arranger) receives an invitation,
creates an account and logs in to a **separate, customer-facing dashboard** (`/portal`) — not the
venue dashboard (`/app`). There they plan their event and collaborate with the venue (utleier).

| Capability | Customer | Guests | Venue (utleier) |
|---|---|---|---|
| Account & login | invite link → create account | none (token link) | existing `/app` |
| Invitation text + card design | writes & designs, sends | receives link by e-mail | – |
| Guest list + RSVP | manages list, sees answers | accept/decline, diet wishes | sees counts + diet summary |
| Activities plan (Spond-style) | creates, invites | accept/decline per activity | sees schedule if shared |
| Wishlist (food, decoration, …) | builds, **shares** with venue | – | quotes price per item |
| Quote → agreement | accepts / declines / changes | – | accepts, prices, confirms |
| Messages | chat with venue | – | chat with customer, per booking |
| Day plan ("Dagens plan") | builds, **shares** (versioned) | – | reads latest shared version |

**Hard rule — never mixed:** every portal row belongs to exactly one `booking_id` (and its
`organization_id`). A venue sees only its own bookings; a customer only their own booking; a guest
only their own invitation.

---

## 2. Three audiences, three access models

```
 Venue staff  ── auth user + organization_members ──► /app      (exists, untouched)
 Customer     ── auth user + portal_accounts      ──► /portal   (NEW)
 Guest        ── no account, secret link token    ──► /i/[token] (NEW, public, server-side only)
```

**Key decision: customers are NOT added to `organization_members`.** That table's roles feed
`is_org_member()` in every existing RLS policy — a customer there would get venue-wide access.
Customers get a separate `portal_accounts` table and separate policies.

Guests never get an auth user. Like `/kontrakt/[token]` and `login_codes`, their rows have RLS enabled
with **no client policies**; all access goes through server routes using the service role, validating
a hashed token (`generateSecretToken` / `hashSecretToken` already exist in `src/lib/contracts/crypto.ts`).
A guest can read/write only their own RSVP, diet note and the activities they are invited to.

---

## 3. Customer journey

1. Venue sends the contract → customer signs → `rental_contract_versions.status = 'accepted'`.
2. New durable job `email_portal_invite` (same `contract_jobs` queue, same cron) creates a
   `portal_accounts` row + one-time token and e-mails the link (branded with the venue name).
3. `/portal/invite/[token]` → customer sets a password (copy of `/auth/invite/[token]` flow:
   admin `createUser`, claim token atomically, sign in). Later logins: password or the existing
   e-mail code login.
4. Landing: `/portal` — countdown + a 4-step setup checklist (Invitation → Guests → Wishlist → Day plan).
5. Venue side: booking detail gets a **"Kundeportal"** tab (invite status/resend, wishlist inbox,
   chat, shared day plan, guest counts) + a sidebar badge for unanswered customer requests.

---

## 4. Data model (all new, all additive)

Every table: `organization_id uuid not null`, `booking_id uuid not null`, composite FK so a row can
never point to another org's booking, audit trigger (existing `tenant_audit_log` pattern),
idempotent migration, "NOT APPLIED automatically" header like existing migrations.

| Table | Purpose / key columns |
|---|---|
| `portal_accounts` | `user_id` (null until accepted), `customer_id`, `email`, `role` (`host`), `token_hash`, `expires_at`, `accepted_at`, `revoked_at`. Unique open invite per booking+email. Service-role only for token ops. |
| `portal_invite_designs` | per booking: `template_key`, `headline`, `message`, `event_date/time/place`, `dress_code`, `rsvp_deadline`, `palette_key`, `font_key`, `cover_path`, `status` draft/published |
| `portal_guests` | `name`, `email`, `phone`, `group_label`, `token_hash`, `status` invited/accepted/declined/maybe, `party_size`, `diet` (jsonb: tags + note), `responded_at`, `last_sent_at`. **RLS on, no client policy.** |
| `portal_activities` | `title`, `description`, `starts_at`, `ends_at`, `location`, `audience` all/selected, `capacity`, `rsvp_enabled` |
| `portal_activity_invitees` | `activity_id`, `guest_id`, `response` yes/no/maybe, `responded_at` |
| `portal_wish_items` | `category` (food/drink/decoration/furniture/av/cleaning/other), `title`, `description`, `quantity`, `unit`, `status` draft → requested → quoted → approved/declined/withdrawn |
| `portal_wish_quotes` | separate table, **written only by venue staff**: `item_id`, `unit_price_nok`, `total_nok`, `note`, `valid_until`, `status`. Splitting it means customer RLS never needs column-level price guards. |
| `portal_messages` | `sender_kind` customer/staff, `sender_user_id`, `body`, `created_at`, `read_at`, optional `wish_item_id` |
| `portal_schedule_items` | the customer's working day plan: `starts_at`, `duration_min`, `title`, `note`, `responsible` |
| `portal_schedule_versions` | **share = snapshot**: `version`, `items jsonb`, `shared_at`, `acknowledged_by`, `acknowledged_at`. Venue reads the latest snapshot; the customer sees "changed since shared". Mirrors the contract `frozen_document` pattern. |

Settings (additive columns or a small `portal_settings` row per org): `portal_enabled`,
`auto_invite_on_signed`. Booking-level override: `portal_disabled_for_booking`.

**Money safety:** signed contracts are protected by `20261110160000_protect_signed_contracts`.
Approved wishlist extras therefore do **not** write to `booking_line_items` automatically. They appear
on the venue booking as "Godkjente tillegg" with a staff button "Legg til på faktura" (phase 2b).

**Privacy default:** venue sees guest **counts and a diet/allergy summary** (needed for catering),
not names/emails, unless the customer shares the list.

---

## 5. Security & tenant isolation

- **Customer RLS** keyed on `auth.uid()` via a `security definer` helper `portal_booking_ids()`
  (rows where `portal_accounts.user_id = auth.uid()` and not revoked). Customer can read/write only
  their booking's rows, and only in allowed statuses (cannot edit an item once `quoted`; editing
  resets to `requested` and logs an event).
- **Staff RLS** reuses `is_org_member(organization_id)` / `has_org_role(...)`, so platform-admin
  "view as organization" works automatically (it is built into those helpers).
- **Guests:** service-role only, hashed token, rate-limited. Note: the existing `rateLimit()` in
  `contracts/guest.ts` is in-memory (weak on serverless); portal needs a DB-backed limit.
- **Never trust client ids:** org and booking resolved server-side from session / token (checklist
  in `docs/tenant-isolation-checklist.md`). React Query keys include booking id.
- **Portal users must not reach `/app`:** `requireTenantAppAccess` currently sends memberless users to
  tenant onboarding. Add a branch → `/portal`. A person who is both staff and a customer defaults to
  `/app` with a visible "Switch to portal" link.
- **Spike (Phase 0, blocking):** confirm `current_organization_id()` / `profiles.active_organization_id`
  cannot grant a portal user org access (it must require membership). Verify and write a test
  *before* any portal table exists.
- Upload bucket `portal-assets` (private, signed URLs, image types, size cap) for card cover photos.
- E-mail via existing Resend client with `idempotencyKey` per guest send; batches capped (e.g. 200).

---

## 6. UX & design direction (customer-facing = its own product feel)

Applying the taste rules for an *app* screen set (no marketing effects, real content, one idea per screen):

- **Not the venue dashboard.** Venue = dense tables in forest green. Portal = calm, warm, spacious,
  mobile-first (customers and guests are on phones). Venue **logo and name** at the top; accent colour
  from the existing `--rn-primary`, warmer ground (`#f4f1ea`-family already used in e-mails). A
  portal token layer on top of `src/styles/tokens.css`; light + dark both defined.
- **Home** = countdown to the event, the *next three things to do*, unread venue messages. Not a
  KPI grid. Empty states explain the next step with one primary button.
- **Navigation:** bottom tab bar on mobile (Oversikt · Gjester · Ønsker · Dagsplan · Meldinger),
  left rail on desktop adding Invitasjon, Aktiviteter, Kontrakt (PDF link).
- **Invitation designer:** a fixed set of 4–5 curated layouts (not free-form canvas), editable text,
  6 palettes, 3 type pairings, optional cover photo, live preview at phone width. Print/PDF and
  share-image come later.
- **Guest page `/i/[token]`:** the card itself, three big answers (Kommer / Kan ikke / Usikker),
  party size, diet chips (allergi, glutenfri, vegetar, vegansk, annet + note), then the activities
  they are invited to with their own accept/decline. One screen, no login.
- **Wishlist:** categories as sections; each item shows its state chip (Utkast → Sendt → Pris mottatt
  → Godkjent). "Send til utleier" is one explicit action; the quote view shows price per item,
  total, accept/decline per item.
- **Day plan:** vertical timeline, drag-free (up/down + time inputs), "Del med utleier" creates a
  version; clear "Delt v3 · endret siden" status.
- All copy NO/EN through `src/i18n/dictionaries/parts/portal.ts`; event-type aware wording
  (bryllup, konfirmasjon, julebord …); no invented testimonials or numbers.

---

## 7. Phased delivery (each phase shippable and flag-gated)

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 Foundations** | Isolation spike; `portal_accounts`; `/portal` route class + middleware; post-login redirect; portal invite job + e-mail; `/portal/invite/[token]`; empty shell showing booking summary; venue "Kundeportal" tab (invite status/resend) | Customer logs in, sees only their booking; cannot open `/app`; staff unaffected |
| **1 Venue ↔ customer loop** | Messages; wishlist + quotes + approval; day plan share (versioned); staff notifications + e-mails | Full request → quote → approve round-trip, isolated per booking |
| **2 Guests & invitation** | Invite designer; guest list (add/import CSV); send; `/i/[token]` RSVP + diet; counts + diet summary to venue | Guest answers visible to customer; venue sees summary only |
| **2b Billing link** | "Godkjente tillegg" → staff adds to invoice | Never edits signed contract |
| **3 Activities** | Spond-style activities + per-activity RSVP | Invitees respond; capacity respected |
| **4 Polish** | Realtime chat, reminders cron, co-host account, share image/PDF, attachments | – |

Recommended order is above (venue loop first: core B2B value, low deliverability risk). Alternative:
Phase 2 before 1 if the guest invitation is the headline feature — open decision below.

---

## 8. Testing & rollout safety

- **SQL/RLS tests as an authenticated role (not service role)**: customer A cannot read booking B;
  org B staff cannot read org A portal rows; guest token cannot read another guest; customer cannot
  write quotes; revoked account loses access. Added to `test:security` and
  `docs/tenant-isolation-checklist.md` / `rls-security-checklist.md`.
- Vitest for rules (status transitions, token expiry); Playwright flow: sign → invite → login → wish →
  quote → approve.
- Migrations additive, applied to a staging Supabase first (repo convention: hand-applied). Generated
  types lag, so use the existing `as never` table-helper pattern.
- Feature-flagged per org (`portal_enabled`, default **off**); pilot with the Rønningen org only.
- Rollback = turn flag off; no existing data touched.

---

## 9. The only edits to existing code (all small)

1. `contract_jobs.job_type` check constraint: add `email_portal_invite`; handler branch in `contracts/jobs.ts`.
2. `resolvePostAuthRedirect` (`tenant-setup-queries.ts`): no membership + portal account → `/portal`.
3. `src/config/routes.ts` + `src/middleware.ts`: classify `/portal` as protected; `/portal/invite`, `/i` public.
4. `requireTenantAppAccess`: portal-only users → `/portal` instead of tenant onboarding.
5. Booking detail page: add the "Kundeportal" tab (new component, behind the flag).
(Verify before Phase 0: Next 16 docs in `node_modules/next/dist/docs/` per `AGENTS.md`; this repo still uses `middleware.ts`.)

---

## 10. Deliberately skipped in v1 (YAGNI)

Separate `events` table (booking is the event) · new job queue (reuse `contract_jobs`) · realtime
(plain refresh/poll first) · free-form card editor · OG/PDF generator and new dependencies · payments in
the portal · chat attachments · co-host accounts · guest accounts.

---

## 11. Decisions needed before building

1. **Phase order:** ✅ DECIDED — venue loop first (Phase 0 → 1 → 2 guests → 2b → 3 → 4).
2. **Guest-list visibility to venue:** ✅ DECIDED — counts + diet summary only.
3. **Approved extras → invoice:** ✅ DECIDED — staff adds manually.
4. **Scope:** ✅ DECIDED — all event types; auto-send the portal invite on Godkjent (behind the org flag, default off).
5. **Co-host:** ✅ DECIDED — later (not in v1).

**All five decisions are made. Next: Phase 0 implementation plan, then build only on the user's go-ahead.**

---

## 12. Phase 0 — built (not yet applied to any database)

Deviations from section 9, decided while building:
- **No new job type.** The invite is sent directly after contract acceptance (best effort, try/catch in
  `contracts/guest.ts`); staff can always re-send from the booking. Avoids altering `contract_jobs`.
- **Extra hardening:** `current_organization_id()` trusted the self-editable `profiles.active_organization_id`
  without a membership check; the migration makes it require membership (only the support-ticket insert policy uses it).
- Customers read their booking through server code with a safe-column list, not through a new `bookings` policy.

Files: `supabase/migrations/20261112140000_customer_portal_accounts.sql`, `src/lib/portal/*`,
`src/app/portal/**`, `src/components/portal/*`, `src/i18n/dictionaries/parts/portal.ts`; small edits in
`config/routes.ts`, `supabase/middleware.ts`, `tenant-setup-queries.ts`, `require-tenant-app-access.ts`,
`contracts/guest.ts`, `booking-detail-sheet.tsx`, `settings/kontrakter/page.tsx`.
Isolation checks to run after applying the migration: `docs/tenant-isolation-checklist.md` → "Customer portal".
