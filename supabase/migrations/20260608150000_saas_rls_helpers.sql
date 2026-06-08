-- SaaS RLS helper functions.

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
  where om.user_id = auth.uid ();
$$;

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
  );
$$;

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
  );
$$;

create or replace function public.current_organization_id ()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select p.active_organization_id from public.profiles p where p.id = auth.uid ()),
    (select om.organization_id from public.organization_members om where om.user_id = auth.uid () limit 1)
  );
$$;

revoke all on function public.user_organization_ids () from public;
revoke all on function public.is_org_member (uuid) from public;
revoke all on function public.has_org_role (uuid, text[]) from public;
revoke all on function public.current_organization_id () from public;
revoke execute on function public.user_organization_ids () from anon;
revoke execute on function public.is_org_member (uuid) from anon;
revoke execute on function public.has_org_role (uuid, text[]) from anon;
revoke execute on function public.current_organization_id () from anon;
grant execute on function public.user_organization_ids () to authenticated;
grant execute on function public.is_org_member (uuid) to authenticated;
grant execute on function public.has_org_role (uuid, text[]) to authenticated;
grant execute on function public.current_organization_id () to authenticated;
