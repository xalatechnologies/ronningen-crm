-- Organization profile / invoice issuer fields

alter table public.organizations
add column if not exists legal_name text,
add column if not exists tagline text,
add column if not exists org_number text,
add column if not exists address_line1 text,
add column if not exists address_line2 text,
add column if not exists postal_code text,
add column if not exists city text,
add column if not exists contact_email text,
add column if not exists contact_phone text,
add column if not exists bank_account text,
add column if not exists payment_instructions text;

-- Lookup user by email for team invites (owner/admin only, security definer)
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select p.id into found_id
  from public.profiles p
  where lower(trim(p.email)) = lower(trim(lookup_email))
  limit 1;

  return found_id;
end;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;
