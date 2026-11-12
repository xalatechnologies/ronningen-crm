-- Customer portal, Phase 1b: wishlist items, venue quotes and customer counter-offers.
--
-- Additive: three new tables only. Quotes and counters are written ONLY by server code (service
-- role) after authorization, so a customer can never write a price. The customer can write only
-- DRAFT wish items directly (defence in depth); every other state change runs in a server action
-- that validates the transition.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_wish_items (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  category text not null,
  title text not null,
  description text,
  quantity numeric(10, 2) not null default 1,
  unit text,
  status text not null default 'draft',
  revision integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint portal_wish_items_category_check
    check (category in ('food', 'drink', 'decoration', 'furniture', 'av', 'cleaning', 'other')),
  constraint portal_wish_items_status_check
    check (status in ('draft', 'requested', 'quoted', 'countered', 'approved', 'declined', 'withdrawn', 'unavailable')),
  constraint portal_wish_items_title_check check (char_length (btrim (title)) between 1 and 120),
  constraint portal_wish_items_description_check check (description is null or char_length (description) <= 1000),
  constraint portal_wish_items_unit_check check (unit is null or char_length (unit) <= 20),
  constraint portal_wish_items_quantity_check check (quantity > 0 and quantity <= 100000),
  constraint portal_wish_items_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict,
  constraint portal_wish_items_org_id_key unique (organization_id, id)
);

create index if not exists portal_wish_items_booking_idx
  on public.portal_wish_items (booking_id, status);

create table if not exists public.portal_wish_quotes (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  wish_item_id uuid not null,
  revision integer not null,
  unit_price_nok numeric(12, 2) not null,
  total_nok numeric(14, 2) not null,
  vat_included boolean not null default true,
  note text,
  valid_until date,
  source text not null default 'staff',
  status text not null default 'active',
  quoted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  constraint portal_wish_quotes_price_check check (unit_price_nok >= 0 and total_nok >= 0),
  constraint portal_wish_quotes_note_check check (note is null or char_length (note) <= 1000),
  constraint portal_wish_quotes_source_check check (source in ('staff', 'counter')),
  constraint portal_wish_quotes_status_check check (status in ('active', 'superseded')),
  constraint portal_wish_quotes_item_fk
    foreign key (organization_id, wish_item_id)
    references public.portal_wish_items (organization_id, id)
    on delete restrict,
  constraint portal_wish_quotes_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create unique index if not exists portal_wish_quotes_one_active
  on public.portal_wish_quotes (wish_item_id)
  where status = 'active';

create table if not exists public.portal_wish_counters (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  wish_item_id uuid not null,
  quote_id uuid not null references public.portal_wish_quotes (id) on delete restrict,
  revision integer not null,
  proposed_unit_price_nok numeric(12, 2) not null,
  note text,
  status text not null default 'open',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  answered_by uuid references auth.users (id) on delete set null,
  answered_at timestamptz,
  constraint portal_wish_counters_price_check check (proposed_unit_price_nok >= 0),
  constraint portal_wish_counters_note_check check (note is null or char_length (note) <= 1000),
  constraint portal_wish_counters_status_check
    check (status in ('open', 'accepted', 'rejected', 'superseded')),
  constraint portal_wish_counters_item_fk
    foreign key (organization_id, wish_item_id)
    references public.portal_wish_items (organization_id, id)
    on delete restrict,
  constraint portal_wish_counters_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create unique index if not exists portal_wish_counters_one_open
  on public.portal_wish_counters (wish_item_id)
  where status = 'open';

alter table public.portal_wish_items enable row level security;
alter table public.portal_wish_quotes enable row level security;
alter table public.portal_wish_counters enable row level security;

-- Items: customer reads their booking's items; writes ONLY draft rows. Staff read their org's items.
drop policy if exists "portal_wish_items_customer_select" on public.portal_wish_items;
create policy "portal_wish_items_customer_select"
on public.portal_wish_items for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_wish_items_customer_insert" on public.portal_wish_items;
create policy "portal_wish_items_customer_insert"
on public.portal_wish_items for insert to authenticated
with check (
  status = 'draft'
  and created_by = auth.uid ()
  and booking_id in (select public.portal_booking_ids ())
);

drop policy if exists "portal_wish_items_customer_update_draft" on public.portal_wish_items;
create policy "portal_wish_items_customer_update_draft"
on public.portal_wish_items for update to authenticated
using (status = 'draft' and booking_id in (select public.portal_booking_ids ()))
with check (status = 'draft' and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_wish_items_customer_delete_draft" on public.portal_wish_items;
create policy "portal_wish_items_customer_delete_draft"
on public.portal_wish_items for delete to authenticated
using (status = 'draft' and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_wish_items_staff_select" on public.portal_wish_items;
create policy "portal_wish_items_staff_select"
on public.portal_wish_items for select to authenticated
using (public.is_org_member (organization_id));

-- Quotes and counters: read-only for clients. Customers see ACTIVE quotes of their own booking.
drop policy if exists "portal_wish_quotes_customer_select" on public.portal_wish_quotes;
create policy "portal_wish_quotes_customer_select"
on public.portal_wish_quotes for select to authenticated
using (status = 'active' and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_wish_quotes_staff_select" on public.portal_wish_quotes;
create policy "portal_wish_quotes_staff_select"
on public.portal_wish_quotes for select to authenticated
using (public.is_org_member (organization_id));

drop policy if exists "portal_wish_counters_customer_select" on public.portal_wish_counters;
create policy "portal_wish_counters_customer_select"
on public.portal_wish_counters for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_wish_counters_staff_select" on public.portal_wish_counters;
create policy "portal_wish_counters_staff_select"
on public.portal_wish_counters for select to authenticated
using (public.is_org_member (organization_id));

revoke all on public.portal_wish_items, public.portal_wish_quotes, public.portal_wish_counters from anon;
revoke insert, update, delete on public.portal_wish_quotes from authenticated;
revoke insert, update, delete on public.portal_wish_counters from authenticated;
