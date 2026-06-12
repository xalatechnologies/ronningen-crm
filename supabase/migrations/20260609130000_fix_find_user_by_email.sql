-- Backfill profile emails from auth.users (signup trigger may have been skipped for seeded users)
update public.profiles p
set
  email = u.email,
  updated_at = now()
from auth.users u
where
  p.id = u.id
  and u.email is not null
  and trim(u.email) <> ''
  and (p.email is null or trim(p.email) = '');

-- Resolve team invites by email: profiles first, then auth.users
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found_id uuid;
  normalized text;
begin
  if auth.uid() is null then
    return null;
  end if;

  normalized := lower(trim(lookup_email));
  if normalized = '' then
    return null;
  end if;

  select p.id into found_id
  from public.profiles p
  where lower(trim(coalesce(p.email, ''))) = normalized
  limit 1;

  if found_id is not null then
    return found_id;
  end if;

  select u.id into found_id
  from auth.users u
  where lower(trim(coalesce(u.email, ''))) = normalized
  limit 1;

  return found_id;
end;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;
