-- Reservations/inquiries store the name typed on that form.
-- Auto-attaching by email (or unique-email insert fallback) collapsed unrelated
-- bookings onto one customer when a shared phone/email was reused.

drop index if exists public.customers_org_email_normalized_uidx;

create index if not exists customers_org_email_normalized_idx
  on public.customers (organization_id, (lower(trim(email))))
  where email is not null
    and length(trim(email)) > 0;

create or replace function public.resolve_or_create_customer (
  p_organization_id uuid,
  p_customer_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_address text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_org uuid;
  v_email text;
  v_name text;
  v_phone text;
  v_address text;
begin
  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_name := trim(coalesce(p_name, ''));
  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_address := nullif(trim(coalesce(p_address, '')), '');

  -- Only an explicit customer_id (picker / convert) reuses a row.
  if p_customer_id is not null then
    select c.id, c.organization_id into v_id, v_org
    from public.customers c
    where c.id = p_customer_id;

    if v_id is null then
      raise exception 'customer_not_found';
    end if;
    if v_org is distinct from p_organization_id then
      raise exception 'customer_org_mismatch';
    end if;

    update public.customers c
    set
      phone = case
        when (c.phone is null or length(trim(c.phone)) = 0) and v_phone is not null
          then v_phone
        else c.phone
      end,
      address = case
        when (c.address is null or length(trim(c.address)) = 0) and v_address is not null
          then v_address
        else c.address
      end,
      email = case
        when (c.email is null or length(trim(c.email)) = 0) and v_email is not null
          then v_email
        else c.email
      end,
      updated_at = now()
    where c.id = v_id;

    return v_id;
  end if;

  if length(v_name) < 1 then
    raise exception 'customer_name_required';
  end if;

  insert into public.customers (
    organization_id,
    name,
    email,
    phone,
    address
  )
  values (
    p_organization_id,
    v_name,
    v_email,
    v_phone,
    v_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.resolve_or_create_customer (uuid, uuid, text, text, text, text) from public;
grant execute on function public.resolve_or_create_customer (uuid, uuid, text, text, text, text) to authenticated, service_role;
