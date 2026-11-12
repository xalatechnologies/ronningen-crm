-- Platform admin "view as organization" gets real tenant access, but only while a logged
-- impersonation session is open for that exact organization.
--
-- Additive: one new helper function; the three RLS helpers are re-created with one extra
-- OR-branch. Normal members behave exactly as before. A platform admin outside an active
-- session (ended_at is null, started within the last hour = the cookie lifetime) gets nothing.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create or replace function public.is_impersonating_org (org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select auth.uid () is not null
    and coalesce (
      (select p.is_platform_admin from public.profiles p where p.id = auth.uid ()),
      false
    )
    and exists (
      select 1
      from public.platform_impersonation_sessions s
      where s.admin_user_id = auth.uid ()
        and s.organization_id = org_id
        and s.ended_at is null
        and s.started_at > now () - interval '1 hour'
    );
$$;

revoke all on function public.is_impersonating_org (uuid) from public;
revoke execute on function public.is_impersonating_org (uuid) from anon;
grant execute on function public.is_impersonating_org (uuid) to authenticated;

create or replace function public.is_org_member (org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid ()
  )
  or public.is_impersonating_org (org_id);
$$;

-- While viewing as an organization the admin acts as its owner (every owner policy passes).
create or replace function public.has_org_role (org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid ()
      and om.role = any (allowed_roles)
  )
  or ('owner' = any (allowed_roles) and public.is_impersonating_org (org_id));
$$;

create or replace function public.user_organization_ids ()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid ()
  union
  select s.organization_id
  from public.platform_impersonation_sessions s
  where s.admin_user_id = auth.uid ()
    and s.ended_at is null
    and s.started_at > now () - interval '1 hour'
    and public.is_impersonating_org (s.organization_id);
$$;
