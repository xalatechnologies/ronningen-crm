-- Speed up profiles RLS: avoid recursive policy checks and heavy joins on self-read.

create or replace function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_members om_self
      join public.organization_members om_target
        on om_self.organization_id = om_target.organization_id
      where om_self.user_id = auth.uid()
        and om_target.user_id = target_user_id
    );
$$;

revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated;

drop policy if exists "read_own_profile" on public.profiles;
drop policy if exists "read_org_member_profiles" on public.profiles;

create policy "read_profiles_scoped"
on public.profiles for select to authenticated
using (public.can_read_profile(id));

-- Prevent profiles UPDATE policy recursion via current_profile_role().
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;
