-- Recording «last seen» (organizations.last_activity_at) must not change
-- organizations.updated_at, which should only move when the organization
-- itself is edited (profile, subscription, suspension, ...).

create or replace function public.organizations_set_updated_at ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (to_jsonb(new) - 'last_activity_at' - 'updated_at')
     is not distinct from (to_jsonb(old) - 'last_activity_at' - 'updated_at') then
    -- Only last_activity_at changed: keep the previous updated_at.
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.organizations_set_updated_at ();
