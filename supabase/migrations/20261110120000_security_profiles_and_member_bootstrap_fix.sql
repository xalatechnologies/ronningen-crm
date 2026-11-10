-- Security hardening. Additive only: no data is changed, no rows deleted.
--
-- 1. Authenticated users could set profiles.role / is_platform_admin on their own
--    row (policy self_update_profiles covers every column). Block those columns
--    for API callers; service_role and SQL-editor/postgres sessions are unaffected.
-- 2. The member bootstrap policy compared om.organization_id to itself, so any
--    user without memberships could insert themselves as owner of ANY organization.

create or replace function public.profiles_protect_privileged_columns ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
    and (
      new.role is distinct from old.role
      or new.is_platform_admin is distinct from old.is_platform_admin
    )
  then
    raise exception 'role and is_platform_admin can only be changed by the service role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
before update on public.profiles
for each row execute function public.profiles_protect_privileged_columns ();

-- Must bypass RLS: under RLS a stranger cannot see a victim org's members, so a
-- plain "not exists" subquery would be true for every organization.
create or replace function public.organization_has_no_members (p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.organization_members where organization_id = p_org
  );
$$;

revoke all on function public.organization_has_no_members (uuid) from public, anon;
grant execute on function public.organization_has_no_members (uuid) to authenticated;

drop policy if exists "org_owner_admin_manage_organization_members" on public.organization_members;

create policy "org_owner_admin_manage_organization_members"
on public.organization_members for insert to authenticated
with check (
  public.has_org_role (organization_id, array['owner', 'admin'])
  or (
    user_id = auth.uid ()
    and role = 'owner'
    and public.organization_has_no_members (organization_id)
  )
);
