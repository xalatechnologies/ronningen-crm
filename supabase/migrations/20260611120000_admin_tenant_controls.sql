-- Admin tenant controls: suspension, internal notes, platform-admin visibility

alter table public.organizations
add column if not exists is_suspended boolean not null default false,
add column if not exists suspended_at timestamptz,
add column if not exists suspended_reason text,
add column if not exists admin_notes text;

create index if not exists organizations_is_suspended_idx
  on public.organizations (is_suspended)
  where is_suspended = true;

-- Self-only platform admin check (avoids exposing flag via broad profile reads)
create or replace function public.is_current_user_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_platform_admin() from public;
grant execute on function public.is_current_user_platform_admin() to authenticated;

drop policy if exists "read_profiles_authenticated" on public.profiles;

create policy "read_own_profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "read_org_member_profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.organization_members om_self
    join public.organization_members om_target
      on om_self.organization_id = om_target.organization_id
    where om_self.user_id = auth.uid()
      and om_target.user_id = profiles.id
  )
);
