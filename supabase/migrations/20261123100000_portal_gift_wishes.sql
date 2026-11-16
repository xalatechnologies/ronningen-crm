-- Customer portal: the couple's GIFT WISH LIST, shared with wedding guests through their secret links.
--
-- Not the venue wish list (portal_wish_items = food/decor/equipment quotes to the venue); this is what the
-- couple wishes to RECEIVE (gifts and other wishes). Guests mark "I'll give this" so nobody buys it twice.
--
-- Additive: four tables, one trigger function, one claim function. No existing table is changed.
--
-- PRIVACY MODEL
--  * gift_wishes / gift_wish_settings: the customer manages them (RLS by booking, column grants). Guests and
--    venue staff have no policy; guests go through server code that validates their secret link.
--  * gift_wish_claims (who gives what): NO policy and NO grant for any client role. Only the service role
--    (server code) reads it, so the surprise "who gave what" stays hidden from the couple according to the
--    couple's own setting (reveal_mode), enforced in server code, never in the browser.
--  * Bookings FKs cascade, so deleting a booking removes this data without touching
--    delete_booking_with_contracts().
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.gift_wish_settings (
  booking_id uuid primary key,
  organization_id uuid not null,
  -- guests only see the list once the couple has switched sharing on
  shared boolean not null default false,
  -- when the couple may see WHO gave a gift: after the event date (default), never, or right away
  reveal_mode text not null default 'event_date',
  updated_at timestamptz not null default now (),
  constraint gift_wish_settings_reveal_check check (reveal_mode in ('event_date', 'never', 'now')),
  constraint gift_wish_settings_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create table if not exists public.gift_wishes (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null,
  booking_id uuid not null,
  kind text not null default 'gift',
  title text not null,
  url text,
  image_url text,
  price_nok integer,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint gift_wishes_kind_check check (kind in ('gift', 'other')),
  constraint gift_wishes_title_check check (char_length (btrim (title)) between 1 and 80 and title !~* '(https?://|www\.)'),
  constraint gift_wishes_note_check check (char_length (note) <= 300 and note !~* '(https?://|www\.)'),
  constraint gift_wishes_url_check check (url is null or (char_length (url) <= 500 and url ~* '^https://')),
  constraint gift_wishes_image_check check (image_url is null or (char_length (image_url) <= 500 and image_url ~* '^https://')),
  constraint gift_wishes_price_check check (price_nok is null or price_nok between 0 and 1000000),
  constraint gift_wishes_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create index if not exists gift_wishes_booking_idx on public.gift_wishes (booking_id, created_at);

-- Hard cap: 100 wishes per booking.
create or replace function public.gift_wishes_enforce_cap ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count (*) from public.gift_wishes where booking_id = new.booking_id) >= 100 then
    raise exception 'gift wish list is limited to 100 wishes per booking' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists gift_wishes_enforce_cap on public.gift_wishes;
create trigger gift_wishes_enforce_cap
before insert on public.gift_wishes
for each row execute function public.gift_wishes_enforce_cap ();

-- One giver per wish (the primary key makes a double claim impossible, even in a race).
create table if not exists public.gift_wish_claims (
  wish_id uuid primary key references public.gift_wishes (id) on delete cascade,
  guest_id uuid not null references public.portal_guests (id) on delete cascade,
  booking_id uuid not null,
  claimed_at timestamptz not null default now ()
);

create index if not exists gift_wish_claims_guest_idx on public.gift_wish_claims (guest_id);

-- Per-guest rate limit state (server only).
create table if not exists public.gift_wish_guest_limits (
  guest_id uuid primary key references public.portal_guests (id) on delete cascade,
  last_action_at timestamptz not null default now (),
  action_count integer not null default 0
);

alter table public.gift_wish_settings enable row level security;
alter table public.gift_wishes enable row level security;
alter table public.gift_wish_claims enable row level security;
alter table public.gift_wish_guest_limits enable row level security;

-- Settings: the customer reads and writes their own booking's row.
drop policy if exists "gift_wish_settings_customer_select" on public.gift_wish_settings;
create policy "gift_wish_settings_customer_select"
on public.gift_wish_settings for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "gift_wish_settings_customer_insert" on public.gift_wish_settings;
create policy "gift_wish_settings_customer_insert"
on public.gift_wish_settings for insert to authenticated
with check (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "gift_wish_settings_customer_update" on public.gift_wish_settings;
create policy "gift_wish_settings_customer_update"
on public.gift_wish_settings for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

-- Wishes: full customer control of their own booking's wishes.
drop policy if exists "gift_wishes_customer_select" on public.gift_wishes;
create policy "gift_wishes_customer_select"
on public.gift_wishes for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "gift_wishes_customer_insert" on public.gift_wishes;
create policy "gift_wishes_customer_insert"
on public.gift_wishes for insert to authenticated
with check (created_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "gift_wishes_customer_update" on public.gift_wishes;
create policy "gift_wishes_customer_update"
on public.gift_wishes for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "gift_wishes_customer_delete" on public.gift_wishes;
create policy "gift_wishes_customer_delete"
on public.gift_wishes for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

revoke all on public.gift_wish_settings from anon, authenticated;
revoke all on public.gift_wishes from anon, authenticated;
revoke all on public.gift_wish_claims from anon, authenticated;
revoke all on public.gift_wish_guest_limits from anon, authenticated;

grant select (booking_id, organization_id, shared, reveal_mode, updated_at) on public.gift_wish_settings to authenticated;
grant insert (booking_id, organization_id, shared, reveal_mode) on public.gift_wish_settings to authenticated;
grant update (shared, reveal_mode, updated_at) on public.gift_wish_settings to authenticated;

grant select (id, organization_id, booking_id, kind, title, url, image_url, price_nok, note, created_at, updated_at)
  on public.gift_wishes to authenticated;
grant insert (organization_id, booking_id, kind, title, url, image_url, price_nok, note, created_by)
  on public.gift_wishes to authenticated;
grant update (kind, title, url, image_url, price_nok, note, updated_at) on public.gift_wishes to authenticated;
grant delete on public.gift_wishes to authenticated;

-- A guest takes a gift, atomically: the booking match, "sharing is on" and the per-guest cap (10) are all
-- checked here. Returns 'ok' | 'taken' | 'not_found' | 'limit'. Service role only.
create or replace function public.gift_wish_claim (p_guest_id uuid, p_wish_id uuid)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_booking uuid;
  v_mine integer;
begin
  select booking_id into v_booking from public.portal_guests where id = p_guest_id;
  if v_booking is null then
    return 'not_found';
  end if;
  if not exists (select 1 from public.gift_wishes w where w.id = p_wish_id and w.booking_id = v_booking)
     or not exists (select 1 from public.gift_wish_settings s where s.booking_id = v_booking and s.shared) then
    return 'not_found';
  end if;
  if exists (select 1 from public.gift_wish_claims where wish_id = p_wish_id and guest_id = p_guest_id) then
    return 'ok';
  end if;
  select count (*) into v_mine from public.gift_wish_claims where guest_id = p_guest_id;
  if v_mine >= 10 then
    return 'limit';
  end if;
  insert into public.gift_wish_claims (wish_id, guest_id, booking_id) values (p_wish_id, p_guest_id, v_booking)
  on conflict (wish_id) do nothing;
  if not found then
    return 'taken';
  end if;
  return 'ok';
end;
$$;

revoke all on function public.gift_wish_claim (uuid, uuid) from public, anon, authenticated;
grant execute on function public.gift_wish_claim (uuid, uuid) to service_role;
