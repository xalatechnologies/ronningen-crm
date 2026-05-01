-- Leverandører / partnere (catering, dekor, renhold m.m.)

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
    category in ('catering', 'decoration', 'cleaning', 'other')
  )
);

drop trigger if exists trg_partners_updated_at on public.partners;

create trigger trg_partners_updated_at
before update on public.partners
for each row
execute function public.set_updated_at ();

alter table public.partners enable row level security;

create policy "read_partners_authenticated"
on public.partners for select to authenticated using (true);

create policy "owner_admin_modify_partners"
on public.partners for all to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

notify pgrst, 'reload schema';
