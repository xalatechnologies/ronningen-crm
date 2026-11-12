-- Customer portal, Phase 2b: the invitation card (text + design) the customer will send to guests.
--
-- Additive: one new table, one row per booking. Customer-owned content: the customer manages it,
-- venue staff have NO policy on it. Guests (Phase 2c) only ever see the PUBLISHED version, through
-- server code. Lengths and a no-links rule are enforced in the database as well as in the app.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_invite_designs (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  template_key text not null default 'klassisk',
  palette_key text not null default 'skog',
  font_key text not null default 'serif',
  headline text not null default '',
  message text not null default '',
  event_date_text text not null default '',
  event_time_text text not null default '',
  place_text text not null default '',
  dress_code text not null default '',
  rsvp_deadline date,
  status text not null default 'draft',
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint portal_invite_designs_booking_key unique (booking_id),
  constraint portal_invite_designs_template_check check (template_key in ('klassisk', 'moderne', 'ramme', 'stripe')),
  constraint portal_invite_designs_palette_check check (palette_key in ('skog', 'sand', 'natt', 'rose', 'salvie', 'kull')),
  constraint portal_invite_designs_font_check check (font_key in ('serif', 'sans', 'elegant')),
  constraint portal_invite_designs_status_check check (status in ('draft', 'published')),
  constraint portal_invite_designs_published_check check ((status = 'published') = (published_at is not null)),
  constraint portal_invite_designs_headline_check check (char_length (headline) <= 80),
  constraint portal_invite_designs_message_check check (char_length (message) <= 600),
  constraint portal_invite_designs_date_check check (char_length (event_date_text) <= 60),
  constraint portal_invite_designs_time_check check (char_length (event_time_text) <= 40),
  constraint portal_invite_designs_place_check check (char_length (place_text) <= 120),
  constraint portal_invite_designs_dress_check check (char_length (dress_code) <= 60),
  -- No links in any text field (phishing and spam guard); the app also blocks bare domains.
  constraint portal_invite_designs_no_links check (
    (headline || ' ' || message || ' ' || event_date_text || ' ' || event_time_text || ' ' || place_text || ' ' || dress_code)
      !~* '(https?://|www\.)'
  ),
  constraint portal_invite_designs_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

alter table public.portal_invite_designs enable row level security;

drop policy if exists "portal_invite_designs_customer_select" on public.portal_invite_designs;
create policy "portal_invite_designs_customer_select"
on public.portal_invite_designs for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_invite_designs_customer_insert" on public.portal_invite_designs;
create policy "portal_invite_designs_customer_insert"
on public.portal_invite_designs for insert to authenticated
with check (updated_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_invite_designs_customer_update" on public.portal_invite_designs;
create policy "portal_invite_designs_customer_update"
on public.portal_invite_designs for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (updated_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

-- No delete policy on purpose (the design is edited, not removed). No staff policy: customer content.
revoke all on public.portal_invite_designs from anon, authenticated;
grant select on public.portal_invite_designs to authenticated;
grant insert (
  organization_id, booking_id, template_key, palette_key, font_key, headline, message, event_date_text,
  event_time_text, place_text, dress_code, rsvp_deadline, status, published_at, updated_by
) on public.portal_invite_designs to authenticated;
grant update (
  template_key, palette_key, font_key, headline, message, event_date_text, event_time_text, place_text,
  dress_code, rsvp_deadline, status, published_at, updated_by, updated_at
) on public.portal_invite_designs to authenticated;
