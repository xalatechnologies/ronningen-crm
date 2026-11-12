# Customer portal — Phase 2 plan: guests, invitation, RSVP, activities

Status: **PROPOSAL — nothing built.** Builds on Phase 0 + Phase 1 (commits `9c31532`, `6ea8be9`,
`f8cac9a`, `56a3a03`). Same rules: purely additive, flag-gated, one booking = one isolated world,
mobile-first, venue sees **counts + diet summary only** (decided earlier).

What the customer gets: build a guest list, write the invitation and design the card, send it by
e-mail, see who answers and what they need to eat, and run an activities plan guests can accept or
decline (Spond-style). What the guest gets: one link, no account, one calm mobile page.

---

## 1. The three audiences (recap, now with guests)

```
Venue staff  ── auth + organization_members ──► /app   sees AGGREGATES only (counts, diet totals)
Customer     ── auth + portal_accounts      ──► /portal full control of guests, card, activities
Guest        ── NO account, secret link     ──► /i/[token]  answers for their own invitation only
```

Guest rows are never readable by venue staff and never by other guests. The venue gets a
`security definer` summary function that returns numbers only.

---

## 2. Delivery in four slices

| Slice | Scope | Notes |
|---|---|---|
| **2a Guest list** | `portal_guests`, `/portal/guests` (add, edit, paste-import, groups, max party), venue "Gjester" tab with **aggregates only** | No e-mail yet: safe to ship first, proves the privacy model |
| **2b Invitation designer** | `portal_invite_designs`, curated card templates, live phone preview, draft/publish | Typographic cards, no uploads in v1 |
| **2c Send + RSVP** | guest e-mails, `/i/[token]` page, answer + party + diet + consent, reminders, stop link, retention cron | The outward-facing, highest-risk slice |
| **2d Activities** | `portal_activities`, invitees, per-activity yes/no/maybe on the guest page, response view for the customer | Reuses the guest token page |

Each slice: one migration (applied by you), isolation tests on the live DB with scripted test data, cleanup, commit.

---

## 3. Data model (all additive)

Every table: `organization_id`, `booking_id`, composite FK to `bookings`, RLS on, audit-friendly.

### 3.1 `portal_guests` (2a)
`id, name, email (nullable), phone (nullable), group_label, max_party int default 1 (1..10),
status ('not_sent','invited','accepted','declined','maybe'), party_size int, diet jsonb, diet_consent_at,
token_hash unique, responded_at, last_sent_at, send_count, opted_out boolean, created_at`

- **Customer RLS:** full CRUD on their booking's guests, with `token_hash` excluded by column grants
  (same pattern as `portal_accounts`).
- **Staff:** **no policy at all.** Venue reads the summary function below.
- **Guest access:** server routes with the service role, validating the hashed token. No client policy.
- Unique `(booking_id, lower(email))` where email is not null; hard cap **300 guests per booking**.
- `diet` = list per person: `[{ "label": "Gjest 1", "tags": ["gluten","nøtter"], "note": "…" }]`
  (tags from a fixed set: allergi-gluten, nøtter, melk, egg, skalldyr, fisk, soya, vegetar, vegansk, halal, annet).

### 3.2 Venue summary (2a): `portal_guest_summary(p_booking_id uuid)`
`security definer`, checks `is_org_member(booking.organization_id)` inside, returns
`{ invited, accepted_people, declined, maybe, not_answered, rsvp_deadline, diet: { tag: count } }`.
Numbers only: no names, e-mails or free-text notes. Free-text diet notes reach the venue only as a
count ("3 har skrevet en kommentar"), unless the customer chooses to share them (later option).

### 3.3 `portal_invite_designs` (2b)
One row per booking: `template_key, headline, message, event_date_text, event_time_text, place_text,
dress_code, rsvp_deadline date, palette_key, font_key, status draft|published, published_at, updated_at`.
Customer CRUD; no staff access; the guest page reads the **published** version via the service role.

### 3.4 `portal_guest_emails` (2c)
`id, guest_id, kind invite|reminder, sent_at, provider_message_id, status`: audit trail, per-booking
daily send limit, and "who was reminded when". Server-written only.

### 3.5 `portal_activities` + `portal_activity_invitees` (2d)
Activity: `title, description, starts_at, ends_at, location, audience all|selected, capacity, rsvp_enabled`.
Invitee: `activity_id, guest_id, response yes|no|maybe, responded_at`. Customer CRUD; guests answer through
the token page; venue sees nothing (activities that matter to the venue belong in the shared day plan).

---

## 4. Guest experience: `/i/[token]` (mobile-first, no login)

1. **The card** at the top: the customer's design, big and readable, venue-neutral (it is the couple's
   invitation, not a venue ad); small "Arrangert hos {venue}" line.
2. **Three big answers:** *Kommer* · *Kan ikke* · *Usikker*; for *Kommer*: how many (up to `max_party`).
3. **Diet, per person:** tap chips (gluten, nøtter, vegetar …) + optional note. A short plain consent
   line with a checkbox: the information is shared with the host and the venue only as totals.
4. **Activities** the guest is invited to, each with its own yes/no/maybe (2d).
5. **Done state:** "Takk, svaret ditt er lagret", change anytime until the deadline; after the deadline
   the page is read-only with the host's contact hint.
6. Footer: stop-reminders link (sets `opted_out`), privacy note. No tracking pixels, no ads.

Security: 32-byte random token per guest, only its SHA-256 stored; generic "link not valid" for every
failure (no enumeration); DB-backed rate limit per token and per IP; guest can read and write only their
own invitation; nothing from the page can reach other guests.

---

## 5. E-mail (2c)

- Sent with the existing Resend client. **From:** "{Host names} via {venue}" on the platform sender;
  **Reply-To:** the host's e-mail (host can switch this off). Subject is fixed-pattern, not free text.
- Body: plain, branded to the card palette, one button to `/i/[token]`, fixed footer with the stop link and
  who sent it. The host's message text is rendered as text; **links in the message are rejected in v1**
  (phishing/spam abuse).
- **Limits:** sends only to addresses on the guest list; max 300 e-mails per booking per day; reminders
  at most once per 3 days per guest; stopped guests never mailed again.
- **Test safety:** the mailer skips reserved test domains (`example.com`, `.test`, `.invalid`) so tests
  never mail anyone.
- **Known gap:** there is no Resend bounce webhook in the app today; undeliverable addresses are not
  flagged automatically. Proposed follow-up: a small webhook route that marks bounced guests.

---

## 6. Privacy (GDPR) — decisions that matter

Allergies and diets can be **health data** (special category) and religion (halal); treat them carefully.

- **Explicit consent** captured on the guest page (timestamp stored in `diet_consent_at`); diet is not stored without it.
- **Minimisation:** venue gets totals per tag only; the customer sees full answers because they are the host.
- **Retention (decided): kept until the customer deletes it.** No automatic deletion. Because GDPR expects
  personal data not to be kept longer than needed, this is a legal call for you to confirm. Mitigations built
  in: the customer can delete one guest or the whole list at any time; a guest can use the stop link at any
  time; and the portal will show the customer a "Slett gjesteliste" button plus a gentle reminder after the
  event date. Switching to automatic deletion later is one small cron job (the existing cron pattern).
- **Roles:** the customer is the controller of their guest list, the platform is the processor, the venue
  receives aggregates. **Needs your legal review** (privacy text on the guest page, data-processing terms).
- **Platform admin:** no new access; "view as organization" still sees only what staff see (aggregates).

---

## 7. Customer screens (mobile-first)

Bottom bar grows to five tabs: **Oversikt · Gjester · Ønsker · Dagsplan · Meldinger**.

| Screen | Content |
|---|---|
| **Gjester** | Summary chips (Svart ja · Nei · Usikker · Venter) and diet totals; guest rows with status chips; add via sheet; **"Lim inn liste"** (one textarea, one guest per line: `Navn, e-post`) with a preview before saving; groups; sticky "Send invitasjon til N" bar |
| **Invitasjon** (inside Gjester) | Template picker (4–5 curated layouts), palette (6) and type pairing (3), fields (headline, message, date, time, place, dress code, RSVP deadline), **live phone-width preview**, "Publiser og send" |
| **Aktiviteter** (2d) | Timeline-style list, add via sheet, choose invitees (all / selected), see who answered |

Venue (`/app/bookings/[id]/portal`): new **Gjester** tab, numbers only: invited, coming (people), declined,
maybe, no answer, RSVP deadline, diet totals, and "N har skrevet en kommentar".

Design rules (taste skill, app screens): calm ground, one primary action per screen, 44px targets, 16px
inputs, cards as real HTML/CSS (no stock imagery in v1), nothing decorative, dark mode defined, NO/EN.

---

## 8. Security & tests

- RLS tests as `authenticated` (never service role): customer A cannot read/write booking B's guests;
  venue staff and other organizations see **no guest rows** (0) and get numbers only via the function;
  `token_hash` unreadable by clients; customers cannot write `emails`/status fields they should not.
- Guest-page tests: valid token returns only that guest; wrong, expired-format and tampered tokens return
  the same generic result; two guests never see each other; rate limit triggers.
- Unit tests: RSVP validation, party-size bounds, diet tag set, paste-import parser, link-in-message rejection,
  send limits, retention cutoff, summary math.
- E-mail: no real mail in tests (reserved-domain skip); one controlled send to an address you own before go-live.

---

## 9. Edits to existing code (small)

`notification-events.ts` (new event keys), `portal-shell.tsx` (5th tab), `emailCustomerThrottled` untouched
(guest e-mail uses its own sender), `email-client.ts` (skip reserved test
domains). New `portal_guests_enabled` org switch, default **off**.

---

## 10. Skipped in Phase 2 (YAGNI)

Cover photo upload (needs a private storage bucket) · guest accounts or logins · SMS · QR codes ·
seating chart · gift registry · guest-to-guest chat · PDF/print of the card · payments · bounce webhook
(listed above as a follow-up) · sharing free-text diet notes with the venue.

---

## 11. Decisions (all made)

1. **Slice order:** ✅ 2a → 2b → 2c → 2d.
2. **Card visuals:** ✅ typographic templates only in v1 (no uploads).
3. **Diet / guest data retention:** ✅ kept until the customer deletes it (no automatic deletion; legal review recommended, see section 6).
4. **Party model:** ✅ one invitation covers a household up to a max set by the customer; diet per person.
5. **Defaults (unless you object):** separate org switch for guest e-mails, off by default · Reply-To = the host ·
   links in the host's message are rejected · bounce webhook as a follow-up.

Next: build slice **2a Guest list** on the user's go-ahead.
