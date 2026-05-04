-- Overnatting: enheter (leiligheter) og reservasjoner, atskilt fra arrangements-bookinger.

create table if not exists public.accommodation_units (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  property_id uuid references public.properties (id) on delete set null,
  max_guests integer not null default 4
    constraint accommodation_units_max_guests_chk check (max_guests >= 1 and max_guests <= 100),
  notes text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint accommodation_units_name_len check (char_length (trim (name)) >= 1)
);

create index if not exists accommodation_units_property_active_idx
  on public.accommodation_units (property_id, active);

create index if not exists accommodation_units_sort_idx
  on public.accommodation_units (sort_order, name);

comment on table public.accommodation_units is
  'Leilighet/enhet for overnatting; valgfri kobling til public.properties.';

create table if not exists public.accommodation_reservations (
  id uuid primary key default gen_random_uuid (),
  unit_id uuid not null references public.accommodation_units (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  check_in_date date not null,
  check_out_date date not null,
  status text not null default 'confirmed',
  guest_count integer not null default 1
    constraint accommodation_reservations_guest_count_chk check (
      guest_count >= 1 and guest_count <= 100
    ),
  notes text,
  total_price numeric(14, 2),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint accommodation_reservations_dates_chk check (check_in_date < check_out_date),
  constraint accommodation_reservations_status_chk check (
    status in ('tentative', 'confirmed', 'cancelled')
  )
);

create index if not exists accommodation_reservations_unit_dates_idx
  on public.accommodation_reservations (unit_id, check_in_date, check_out_date);

create index if not exists accommodation_reservations_customer_idx
  on public.accommodation_reservations (customer_id);

create index if not exists accommodation_reservations_updated_at_idx
  on public.accommodation_reservations (updated_at desc);

comment on table public.accommodation_reservations is
  'Overnatting: halvåpent intervall [check_in_date, check_out_date).';

-- Overlapp for samme enhet når status tentative eller confirmed.
create or replace function public.accommodation_reservations_enforce_no_overlap ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' then
    return new;
  end if;
  if exists (
    select 1
    from public.accommodation_reservations r
    where r.unit_id = new.unit_id
      and r.id is distinct from new.id
      and r.status in ('tentative', 'confirmed')
      and daterange (r.check_in_date, r.check_out_date, '[)')
        && daterange (new.check_in_date, new.check_out_date, '[)')
  ) then
    raise exception 'Overlappende reservasjon for denne enheten i valgt periode.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.accommodation_reservations_enforce_guest_cap ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
begin
  select u.max_guests into cap
  from public.accommodation_units u
  where u.id = new.unit_id;

  if cap is null then
    raise exception 'Ukjent enhet.' using errcode = '23503';
  end if;

  if new.guest_count > cap then
    raise exception 'Antall gjester (%) overstiger enhetens kapasitet (%).', new.guest_count, cap
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accommodation_reservations_overlap
  on public.accommodation_reservations;

create trigger trg_accommodation_reservations_overlap
before insert or update of unit_id, check_in_date, check_out_date, status
on public.accommodation_reservations
for each row execute function public.accommodation_reservations_enforce_no_overlap ();

drop trigger if exists trg_accommodation_reservations_guest_cap
  on public.accommodation_reservations;

create trigger trg_accommodation_reservations_guest_cap
before insert or update of unit_id, guest_count
on public.accommodation_reservations
for each row execute function public.accommodation_reservations_enforce_guest_cap ();

drop trigger if exists trg_accommodation_units_updated_at on public.accommodation_units;

create trigger trg_accommodation_units_updated_at
before update on public.accommodation_units
for each row execute function public.set_updated_at ();

drop trigger if exists trg_accommodation_reservations_updated_at
  on public.accommodation_reservations;

create trigger trg_accommodation_reservations_updated_at
before update on public.accommodation_reservations
for each row execute function public.set_updated_at ();

alter table public.accommodation_units enable row level security;

alter table public.accommodation_reservations enable row level security;

create policy "read_accommodation_units_authenticated"
on public.accommodation_units for select
to authenticated using (true);

create policy "owner_admin_modify_accommodation_units"
on public.accommodation_units for all
to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "read_accommodation_reservations_authenticated"
on public.accommodation_reservations for select
to authenticated using (true);

create policy "owner_admin_modify_accommodation_reservations"
on public.accommodation_reservations for all
to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

-- Valgfrie eksemplarenheter når tabellen er tom.
insert into public.accommodation_units (name, property_id, max_guests, notes, sort_order)
select
  v.name,
  (select pr.id from public.properties pr where pr.type = 'gård' order by pr.name limit 1),
  v.max_guests,
  v.notes,
  v.sort_order
from (
  values
    ('Leilighet A', 4, 'Øverst i lav', 1),
    ('Leilighet B', 4, 'Utgang mot tun', 2),
    ('Hytte ved vann', 3, 'Egen inngang', 3)
) as v (name, max_guests, notes, sort_order)
where not exists (select 1 from public.accommodation_units limit 1);
