-- Team role hierarchy guard (defence in depth for the Team page rules).
--
-- Today RLS lets any owner OR admin insert/update/delete ANY organization_members row,
-- so an admin could remove the owner or promote someone to admin via the API.
-- This trigger adds the missing hierarchy rule at the database:
--   * owner  : unrestricted (the app keeps its own "last owner" guard)
--   * admin  : may only add / change / remove manager, accountant and viewer members
--              (and may leave the organization themselves)
-- Calls without an auth user (service role, SQL editor, cascades from auth.users) are not restricted.
-- Rows that RLS already rejects never reach the trigger, so first-owner bootstrap is unchanged.
--
-- NOT APPLIED automatically. Review, test on a copy, then apply deliberately.

create or replace function public.enforce_member_hierarchy ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  org_id uuid;
begin
  if auth.uid () is null then
    return coalesce (new, old);
  end if;

  org_id := coalesce (new.organization_id, old.organization_id);

  select om.role into actor_role
  from public.organization_members om
  where om.organization_id = org_id
    and om.user_id = auth.uid ()
  limit 1;

  -- No membership yet (organization bootstrap) or owner: nothing extra to enforce.
  if actor_role is null or actor_role = 'owner' then
    return coalesce (new, old);
  end if;

  if actor_role = 'admin' then
    -- Leaving the organization yourself is always allowed.
    if tg_op = 'DELETE' and old.user_id = auth.uid () then
      return old;
    end if;

    if tg_op in ('UPDATE', 'DELETE') and old.role in ('owner', 'admin') then
      raise exception 'Admins cannot change or remove owners or other admins'
        using errcode = '42501';
    end if;

    if tg_op in ('INSERT', 'UPDATE') and new.role in ('owner', 'admin') then
      raise exception 'Admins cannot assign the owner or admin role'
        using errcode = '42501';
    end if;
  end if;

  return coalesce (new, old);
end;
$$;

revoke all on function public.enforce_member_hierarchy () from public;

drop trigger if exists trg_enforce_member_hierarchy on public.organization_members;
create trigger trg_enforce_member_hierarchy
before insert or update or delete on public.organization_members
for each row execute function public.enforce_member_hierarchy ();
