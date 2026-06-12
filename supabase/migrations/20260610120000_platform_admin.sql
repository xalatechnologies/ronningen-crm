-- Platform super-admin flag and audit log

alter table public.profiles
add column if not exists is_platform_admin boolean not null default false;

create index if not exists profiles_is_platform_admin_idx
  on public.profiles (is_platform_admin)
  where is_platform_admin = true;

create table if not exists public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_log_created_at_idx
  on public.platform_audit_log (created_at desc);

create index if not exists platform_audit_log_actor_idx
  on public.platform_audit_log (actor_user_id);

create index if not exists organizations_subscription_status_idx
  on public.organizations (subscription_status);

alter table public.platform_audit_log enable row level security;

-- Only platform admins can read audit log (via authenticated client if needed later)
create policy "platform_admin_select_audit_log"
on public.platform_audit_log for select to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_platform_admin = true
  )
);

-- Inserts happen via service role from server; no client insert policy
