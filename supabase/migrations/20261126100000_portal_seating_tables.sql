-- Customer portal: seating. The couple makes tables and puts their guests at them; guests can see their own
-- table on their invitation page once the couple switches that on.
--
-- Additive: three new tables, two trigger functions. No existing table is changed.
--
-- PRIVACY MODEL
--  * All three tables are the customer's: RLS by booking, column grants. Guests and venue staff have no policy;
--    guests learn their own table name only through server code that validates their secret link.
--  * A guest sees the NAME of their table, never who else sits there.
--  * An assignment can only join a guest and a table of the SAME booking (trigger), so a customer can never
--    attach another booking's guest to their table.
--  * Bookings FKs cascade, so deleting a booking removes this data without touching delete_booking_with_contracts().
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.seating_settings (
  booking_id uuid primary key,
  organization_id uuid not null,
  -- guests only see their table once the couple has switched this on
  shared boolean not null default false,
  updated_at timestamptz not null default now (),
  constraint seating_settings_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null,
  booking_id uuid not null,
  name text not null,
  capacity integer not null default 8,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint seating_tables_name_check check (char_length (btrim (name)) between 1 and 40 and name !~* '(https?://|www\.)'),
  constraint seating_tables_capacity_check check (capacity between 1 and 60),
  constraint seating_tables_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create index if not exists seating_tables_booking_idx on public.seating_tables (booking_id, created_at);

-- Hard cap: 40 tables per booking.
create or replace function public.seating_tables_enforce_cap ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count (*) from public.seating_tables where booking_id = new.booking_id) >= 40 then
    raise exception 'seating is limited to 40 tables per booking' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists seating_tables_enforce_cap on public.seating_tables;
create trigger seating_tables_enforce_cap
before insert on public.seating_tables
for each row execute function public.seating_tables_enforce_cap ();

-- One table per guest (the guest id is the key). Deleting a guest or a table removes the assignment.
create table if not exists public.seating_assignments (
  guest_id uuid primary key references public.portal_guests (id) on delete cascade,
  table_id uuid not null references public.seating_tables (id) on delete cascade,
  booking_id uuid not null,
  created_at timestamptz not null default now ()
);

create index if not exists seating_assignments_table_idx on public.seating_assignments (table_id);
create index if not exists seating_assignments_booking_idx on public.seating_assignments (booking_id);

-- The guest and the table must both belong to the booking the row says. Reads portal_guests, which the
-- customer role can read only for its own booking, so the function runs with the owner's rights.
create or replace function public.seating_assignments_check ()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not exists (select 1 from public.portal_guests g where g.id = new.guest_id and g.booking_id = new.booking_id)
     or not exists (select 1 from public.seating_tables t where t.id = new.table_id and t.booking_id = new.booking_id) then
    raise exception 'guest and table must belong to the same booking' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists seating_assignments_check on public.seating_assignments;
create trigger seating_assignments_check
before insert or update on public.seating_assignments
for each row execute function public.seating_assignments_check ();

alter table public.seating_settings enable row level security;
alter table public.seating_tables enable row level security;
alter table public.seating_assignments enable row level security;

-- Settings
drop policy if exists "seating_settings_customer_select" on public.seating_settings;
create policy "seating_settings_customer_select" on public.seating_settings for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_settings_customer_insert" on public.seating_settings;
create policy "seating_settings_customer_insert" on public.seating_settings for insert to authenticated
with check (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_settings_customer_update" on public.seating_settings;
create policy "seating_settings_customer_update" on public.seating_settings for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

-- Tables
drop policy if exists "seating_tables_customer_select" on public.seating_tables;
create policy "seating_tables_customer_select" on public.seating_tables for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_tables_customer_insert" on public.seating_tables;
create policy "seating_tables_customer_insert" on public.seating_tables for insert to authenticated
with check (created_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_tables_customer_update" on public.seating_tables;
create policy "seating_tables_customer_update" on public.seating_tables for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_tables_customer_delete" on public.seating_tables;
create policy "seating_tables_customer_delete" on public.seating_tables for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

-- Assignments
drop policy if exists "seating_assignments_customer_select" on public.seating_assignments;
create policy "seating_assignments_customer_select" on public.seating_assignments for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_assignments_customer_insert" on public.seating_assignments;
create policy "seating_assignments_customer_insert" on public.seating_assignments for insert to authenticated
with check (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_assignments_customer_update" on public.seating_assignments;
create policy "seating_assignments_customer_update" on public.seating_assignments for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));
drop policy if exists "seating_assignments_customer_delete" on public.seating_assignments;
create policy "seating_assignments_customer_delete" on public.seating_assignments for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

revoke all on public.seating_settings from anon, authenticated;
revoke all on public.seating_tables from anon, authenticated;
revoke all on public.seating_assignments from anon, authenticated;

grant select (booking_id, organization_id, shared, updated_at) on public.seating_settings to authenticated;
grant insert (booking_id, organization_id, shared) on public.seating_settings to authenticated;
grant update (shared, updated_at) on public.seating_settings to authenticated;

grant select (id, organization_id, booking_id, name, capacity, created_at, updated_at) on public.seating_tables to authenticated;
grant insert (organization_id, booking_id, name, capacity, created_by) on public.seating_tables to authenticated;
grant update (name, capacity, updated_at) on public.seating_tables to authenticated;
grant delete on public.seating_tables to authenticated;

grant select (guest_id, table_id, booking_id, created_at) on public.seating_assignments to authenticated;
grant insert (guest_id, table_id, booking_id) on public.seating_assignments to authenticated;
grant update (table_id) on public.seating_assignments to authenticated;
grant delete on public.seating_assignments to authenticated;
