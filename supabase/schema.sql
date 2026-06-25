-- Rønningen Manager — core schema (run in Supabase SQL editor or via migrations)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'viewer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('owner', 'admin', 'accountant', 'viewer')
  )
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  address text,
  type text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid (),
  category text not null,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_category_check check (
    char_length(trim(category)) >= 2
    and char_length(category) <= 80
  )
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid (),
  customer_id uuid not null references public.customers (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  event_type text not null,
  fest_type text,
  event_date date not null,
  guest_count integer not null default 0,
  status text not null,
  total_price numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  remaining_amount numeric(14, 2) not null default 0,
  notes text,
  booking_reference text,
  payment_due_date date,
  collection_notice_sent_at timestamptz,
  payment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  description text,
  price numeric(14, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  description text,
  price numeric(14, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid (),
  property_id uuid not null references public.properties (id) on delete restrict,
  type text not null,
  category text not null,
  description text,
  amount numeric(14, 2) not null default 0,
  transaction_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid (),
  property_id uuid not null references public.properties (id) on delete restrict,
  name text not null,
  quantity integer not null default 0,
  value numeric(14, 2) not null default 0,
  condition text,
  insurance_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'properties',
    'customers',
    'partners',
    'bookings',
    'packages',
    'services',
    'transactions',
    'assets'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s',
      t
    );
    execute format(
      $f$
        create trigger trg_%1$s_updated_at
        before update on public.%1$s
        for each row
        execute function public.set_updated_at()
      $f$,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth → profiles
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_role ()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Restrict RPC exposure (Supabase linter: anon SECURITY DEFINER / unnecessary definer for role read)
revoke all on function public.handle_new_user () from public;
revoke all on function public.current_profile_role () from public;
revoke execute on function public.handle_new_user () from anon;
revoke execute on function public.handle_new_user () from authenticated;
revoke execute on function public.current_profile_role () from anon;
grant execute on function public.current_profile_role () to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.customers enable row level security;
alter table public.partners enable row level security;
alter table public.bookings enable row level security;
alter table public.packages enable row level security;
alter table public.services enable row level security;
alter table public.transactions enable row level security;
alter table public.assets enable row level security;

-- Authenticated users can read all rows (viewer included).

create policy "read_profiles_authenticated" on public.profiles for select to authenticated using (true);

create policy "read_properties_authenticated" on public.properties for select to authenticated using (true);

create policy "read_customers_authenticated" on public.customers for select to authenticated using (true);

create policy "read_partners_authenticated" on public.partners for select to authenticated using (true);

create policy "read_bookings_authenticated" on public.bookings for select to authenticated using (true);

create policy "read_packages_authenticated" on public.packages for select to authenticated using (true);

create policy "read_services_authenticated" on public.services for select to authenticated using (true);

create policy "read_transactions_authenticated" on public.transactions for select to authenticated using (true);

create policy "read_assets_authenticated" on public.assets for select to authenticated using (true);

-- Owner & admin: full write access on all tables.

create policy "owner_admin_modify_profiles"
on public.profiles for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_properties"
on public.properties for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_customers"
on public.customers for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_partners"
on public.partners for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_bookings"
on public.bookings for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_packages"
on public.packages for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_services"
on public.services for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_transactions"
on public.transactions for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "owner_admin_modify_assets"
on public.assets for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

-- Users may update their own profile row (e.g. display name) without elevated role.

create policy "self_update_profiles"
on public.profiles for update to authenticated
using (id = auth.uid ())
with check (id = auth.uid ());

-- Accountant: manage finance-oriented tables (transactions, packages, services).

create policy "accountant_modify_transactions"
on public.transactions for all to authenticated
using (public.current_profile_role () = 'accountant')
with check (public.current_profile_role () = 'accountant');

create policy "accountant_modify_packages"
on public.packages for all to authenticated
using (public.current_profile_role () = 'accountant')
with check (public.current_profile_role () = 'accountant');

create policy "accountant_modify_services"
on public.services for all to authenticated
using (public.current_profile_role () = 'accountant')
with check (public.current_profile_role () = 'accountant');
