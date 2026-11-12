-- Customer portal, Phase 2a: the customer's guest list, and a numbers-only summary for the venue.
--
-- Additive: one new table, one trigger function, one summary function.
--
-- PRIVACY MODEL: guest rows (names, e-mails, diet answers) are readable ONLY by the customer who owns
-- the booking. Venue staff get NO policy on the table; they read portal_guest_summary(), which returns
-- counts only (no names, e-mails or free text). Guests themselves (Phase 2c) never touch the table
-- directly: server code validates their secret link.
--
-- Clients get column-level grants, so a customer can manage the list but can never set status, diet,
-- consent, tokens or send counters (those are written by server code only).
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_guests (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  name text not null,
  email text,
  phone text,
  group_label text,
  max_party integer not null default 1,
  status text not null default 'not_sent',
  party_size integer not null default 1,
  diet jsonb not null default '[]'::jsonb,
  diet_consent_at timestamptz,
  token_hash text unique,
  responded_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  opted_out boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint portal_guests_name_check check (char_length (btrim (name)) between 1 and 80),
  constraint portal_guests_email_check check (email is null or (char_length (email) <= 254 and email = lower (email))),
  constraint portal_guests_phone_check check (phone is null or char_length (phone) <= 30),
  constraint portal_guests_group_check check (group_label is null or char_length (group_label) <= 40),
  constraint portal_guests_party_check check (max_party between 1 and 10 and party_size between 1 and 10 and party_size <= max_party),
  constraint portal_guests_status_check check (status in ('not_sent', 'invited', 'accepted', 'declined', 'maybe')),
  constraint portal_guests_diet_check check (jsonb_typeof (diet) = 'array'),
  constraint portal_guests_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_guests_booking_idx on public.portal_guests (booking_id, status);

-- One guest per e-mail per booking.
create unique index if not exists portal_guests_booking_email_uidx
  on public.portal_guests (booking_id, lower (email))
  where email is not null;

-- Hard cap: 300 guests per booking (abuse and mail-volume guard).
create or replace function public.portal_guests_enforce_cap ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count (*) from public.portal_guests where booking_id = new.booking_id) >= 300 then
    raise exception 'guest list is limited to 300 guests per booking' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_guests_enforce_cap on public.portal_guests;
create trigger portal_guests_enforce_cap
before insert on public.portal_guests
for each row execute function public.portal_guests_enforce_cap ();

alter table public.portal_guests enable row level security;

drop policy if exists "portal_guests_customer_select" on public.portal_guests;
create policy "portal_guests_customer_select"
on public.portal_guests for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_guests_customer_insert" on public.portal_guests;
create policy "portal_guests_customer_insert"
on public.portal_guests for insert to authenticated
with check (created_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_guests_customer_update" on public.portal_guests;
create policy "portal_guests_customer_update"
on public.portal_guests for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_guests_customer_delete" on public.portal_guests;
create policy "portal_guests_customer_delete"
on public.portal_guests for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

-- Column-level grants: the customer manages who is on the list, nothing the guest or server owns.
revoke all on public.portal_guests from anon, authenticated;
grant select (
  id, organization_id, booking_id, name, email, phone, group_label, max_party, status, party_size,
  diet, diet_consent_at, responded_at, last_sent_at, send_count, opted_out, created_at, updated_at
) on public.portal_guests to authenticated;
grant insert (organization_id, booking_id, name, email, phone, group_label, max_party, created_by)
  on public.portal_guests to authenticated;
grant update (name, email, phone, group_label, max_party, updated_at) on public.portal_guests to authenticated;
grant delete on public.portal_guests to authenticated;

-- Venue summary: numbers only. Callable by members of the booking's organization (incl. platform admin
-- "view as"), never returns names, e-mails or free text.
create or replace function public.portal_guest_summary (p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org uuid;
  v_counts jsonb;
  v_diet jsonb;
  v_comments integer;
begin
  select organization_id into v_org from public.bookings where id = p_booking_id;
  if v_org is null or not public.is_org_member (v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object (
    'total', count (*),
    'not_sent', count (*) filter (where status = 'not_sent'),
    'invited', count (*) filter (where status <> 'not_sent'),
    'no_answer', count (*) filter (where status = 'invited'),
    'accepted_guests', count (*) filter (where status = 'accepted'),
    'accepted_people', coalesce (sum (party_size) filter (where status = 'accepted'), 0),
    'declined', count (*) filter (where status = 'declined'),
    'maybe', count (*) filter (where status = 'maybe')
  )
  into v_counts
  from public.portal_guests
  where booking_id = p_booking_id;

  select coalesce (jsonb_object_agg (t.tag, t.n), '{}'::jsonb)
  into v_diet
  from (
    select tag, count (*) as n
    from public.portal_guests g,
      jsonb_array_elements (g.diet) as p,
      jsonb_array_elements_text (coalesce (p -> 'tags', '[]'::jsonb)) as tag
    where g.booking_id = p_booking_id and g.status = 'accepted'
    group by tag
  ) t;

  select count (*)
  into v_comments
  from public.portal_guests g, jsonb_array_elements (g.diet) as p
  where g.booking_id = p_booking_id
    and g.status = 'accepted'
    and btrim (coalesce (p ->> 'note', '')) <> '';

  return v_counts || jsonb_build_object ('diet', v_diet, 'comments', v_comments);
end;
$$;

revoke all on function public.portal_guest_summary (uuid) from public;
revoke execute on function public.portal_guest_summary (uuid) from anon;
grant execute on function public.portal_guest_summary (uuid) to authenticated;
