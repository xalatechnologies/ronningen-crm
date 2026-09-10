-- Reservation create reliability: idempotent client_request_id, fail-closed uniqueness,
-- org integrity checks, and atomic create_* RPCs. No silent merge/delete of existing rows.

-- ---------------------------------------------------------------------------
-- A. Columns
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists client_request_id uuid;

alter table public.booking_inquiries
  add column if not exists client_request_id uuid;

alter table public.accommodation_reservations
  add column if not exists client_request_id uuid;

comment on column public.bookings.client_request_id is
  'Client-generated UUID for idempotent create; unique per organization when set.';
comment on column public.booking_inquiries.client_request_id is
  'Client-generated UUID for idempotent create; unique per organization when set.';
comment on column public.accommodation_reservations.client_request_id is
  'Client-generated UUID for idempotent create; unique per organization when set.';

-- ---------------------------------------------------------------------------
-- B. Prechecks (fail closed — no auto cleanup)
-- ---------------------------------------------------------------------------

do $$
declare
  v_email_dups integer;
  v_ref_dups integer;
begin
  select count(*)::integer into v_email_dups
  from (
    select organization_id, lower(trim(email)) as e
    from public.customers
    where email is not null
      and length(trim(email)) > 0
    group by organization_id, lower(trim(email))
    having count(*) > 1
  ) d;

  if v_email_dups > 0 then
    raise exception
      'Migration blocked: % org+email duplicate group(s) in customers. Run scripts/report-customer-identity-duplicates.mjs and resolve manually before retrying.',
      v_email_dups;
  end if;

  select count(*)::integer into v_ref_dups
  from (
    select organization_id, trim(booking_reference) as r
    from public.bookings
    where booking_reference is not null
      and length(trim(booking_reference)) > 0
    group by organization_id, trim(booking_reference)
    having count(*) > 1
  ) d;

  if v_ref_dups > 0 then
    raise exception
      'Migration blocked: % org+booking_reference duplicate group(s). Run scripts/report-customer-identity-duplicates.mjs and resolve manually before retrying.',
      v_ref_dups;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- C. Unique indexes (never on name or phone)
-- ---------------------------------------------------------------------------

create unique index if not exists bookings_org_client_request_id_uidx
  on public.bookings (organization_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists booking_inquiries_org_client_request_id_uidx
  on public.booking_inquiries (organization_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists accommodation_reservations_org_client_request_id_uidx
  on public.accommodation_reservations (organization_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists bookings_org_booking_reference_uidx
  on public.bookings (organization_id, (trim(booking_reference)))
  where booking_reference is not null
    and length(trim(booking_reference)) > 0;

create unique index if not exists customers_org_email_normalized_uidx
  on public.customers (organization_id, (lower(trim(email))))
  where email is not null
    and length(trim(email)) > 0;

-- ---------------------------------------------------------------------------
-- D. Org integrity: reservation.organization_id must match customer.organization_id
-- ---------------------------------------------------------------------------

create or replace function public.enforce_reservation_customer_org_match ()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_customer_org uuid;
begin
  if new.customer_id is null then
    return new;
  end if;

  select c.organization_id into v_customer_org
  from public.customers c
  where c.id = new.customer_id;

  if v_customer_org is null then
    raise exception 'customer_not_found';
  end if;

  if new.organization_id is distinct from v_customer_org then
    raise exception 'customer_org_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_customer_org_match_trg on public.bookings;
create trigger bookings_customer_org_match_trg
  before insert or update of customer_id, organization_id
  on public.bookings
  for each row
  execute function public.enforce_reservation_customer_org_match ();

drop trigger if exists booking_inquiries_customer_org_match_trg on public.booking_inquiries;
create trigger booking_inquiries_customer_org_match_trg
  before insert or update of customer_id, organization_id
  on public.booking_inquiries
  for each row
  execute function public.enforce_reservation_customer_org_match ();

drop trigger if exists accommodation_reservations_customer_org_match_trg
  on public.accommodation_reservations;
create trigger accommodation_reservations_customer_org_match_trg
  before insert or update of customer_id, organization_id
  on public.accommodation_reservations
  for each row
  execute function public.enforce_reservation_customer_org_match ();

-- ---------------------------------------------------------------------------
-- E. Shared helpers for atomic creates
-- ---------------------------------------------------------------------------

create or replace function public.assert_can_write_reservations (p_org_id uuid)
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_org_id is null then
    raise exception 'organization_id_required';
  end if;

  -- Service role / bypass: auth.uid() is null; RLS already bypassed for service_role.
  if auth.uid() is null then
    return;
  end if;

  if not public.has_org_role (
    p_org_id,
    array['owner', 'admin', 'manager']
  ) then
    raise exception 'forbidden';
  end if;
end;
$$;

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

    -- Fill missing phone/address only (never overwrite identity fields here).
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
      updated_at = now()
    where c.id = v_id;

    return v_id;
  end if;

  if v_email is not null then
    select c.id into v_id
    from public.customers c
    where c.organization_id = p_organization_id
      and lower(trim(c.email)) = v_email
    limit 1;

    if v_id is not null then
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
        updated_at = now()
      where c.id = v_id;
      return v_id;
    end if;
  end if;

  if length(v_name) < 1 then
    raise exception 'customer_name_required';
  end if;

  begin
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
      case when v_email is null then null else v_email end,
      v_phone,
      v_address
    )
    returning id into v_id;
  exception
    when unique_violation then
      if v_email is null then
        raise;
      end if;
      select c.id into v_id
      from public.customers c
      where c.organization_id = p_organization_id
        and lower(trim(c.email)) = v_email
      limit 1;
      if v_id is null then
        raise;
      end if;
  end;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- F. Atomic create RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_booking_atomic (payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid;
  v_request_id uuid;
  v_customer_id uuid;
  v_booking_id uuid;
  v_inquiry_id uuid;
  v_existing_id uuid;
  v_reused boolean := false;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_request_id := nullif(payload->>'client_request_id', '')::uuid;

  if v_request_id is null then
    raise exception 'client_request_id_required';
  end if;

  perform public.assert_can_write_reservations (v_org);

  select b.id into v_existing_id
  from public.bookings b
  where b.organization_id = v_org
    and b.client_request_id = v_request_id
  limit 1;

  if v_existing_id is not null then
    select b.customer_id into v_customer_id
    from public.bookings b
    where b.id = v_existing_id;
    return jsonb_build_object(
      'customerId', v_customer_id,
      'reservationId', v_existing_id,
      'bookingId', v_existing_id,
      'reused', true
    );
  end if;

  v_customer_id := public.resolve_or_create_customer (
    v_org,
    nullif(payload->>'customer_id', '')::uuid,
    payload->>'customer_name',
    payload->>'customer_email',
    payload->>'customer_phone',
    payload->>'customer_address'
  );

  begin
    insert into public.bookings (
      organization_id,
      client_request_id,
      customer_id,
      property_id,
      fest_type,
      event_type,
      event_date,
      event_end_date,
      event_start_time,
      event_end_time,
      guest_count,
      status,
      total_price,
      paid_amount,
      remaining_amount,
      notes,
      booking_reference,
      payment_status
    )
    values (
      v_org,
      v_request_id,
      v_customer_id,
      nullif(payload->>'property_id', '')::uuid,
      nullif(payload->>'fest_type', ''),
      coalesce(nullif(payload->>'event_type', ''), 'other'),
      (payload->>'event_date')::date,
      nullif(payload->>'event_end_date', '')::date,
      nullif(payload->>'event_start_time', '')::time,
      nullif(payload->>'event_end_time', '')::time,
      coalesce((payload->>'guest_count')::integer, 1),
      coalesce(nullif(payload->>'status', ''), 'pending'),
      coalesce((payload->>'total_price')::numeric, 0),
      coalesce((payload->>'paid_amount')::numeric, 0),
      coalesce((payload->>'remaining_amount')::numeric, 0),
      nullif(payload->>'notes', ''),
      nullif(payload->>'booking_reference', ''),
      coalesce(nullif(payload->>'payment_status', ''), 'unpaid')
    )
    returning id into v_booking_id;
  exception
    when unique_violation then
      select b.id, b.customer_id into v_booking_id, v_customer_id
      from public.bookings b
      where b.organization_id = v_org
        and b.client_request_id = v_request_id
      limit 1;
      if v_booking_id is null then
        raise;
      end if;
      v_reused := true;
  end;

  v_inquiry_id := nullif(payload->>'inquiry_id', '')::uuid;
  if v_inquiry_id is not null and not v_reused then
    update public.booking_inquiries bi
    set
      converted_booking_id = v_booking_id,
      converted_at = now(),
      status = 'converted',
      updated_at = now()
    where bi.id = v_inquiry_id
      and bi.organization_id = v_org
      and bi.converted_booking_id is null;
  end if;

  return jsonb_build_object(
    'customerId', v_customer_id,
    'reservationId', v_booking_id,
    'bookingId', v_booking_id,
    'reused', v_reused
  );
end;
$$;

create or replace function public.create_inquiry_atomic (payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid;
  v_request_id uuid;
  v_customer_id uuid;
  v_inquiry_id uuid;
  v_existing_id uuid;
  v_reused boolean := false;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_request_id := nullif(payload->>'client_request_id', '')::uuid;

  if v_request_id is null then
    raise exception 'client_request_id_required';
  end if;

  perform public.assert_can_write_reservations (v_org);

  select bi.id into v_existing_id
  from public.booking_inquiries bi
  where bi.organization_id = v_org
    and bi.client_request_id = v_request_id
  limit 1;

  if v_existing_id is not null then
    select bi.customer_id into v_customer_id
    from public.booking_inquiries bi
    where bi.id = v_existing_id;
    return jsonb_build_object(
      'customerId', v_customer_id,
      'reservationId', v_existing_id,
      'inquiryId', v_existing_id,
      'reused', true
    );
  end if;

  v_customer_id := public.resolve_or_create_customer (
    v_org,
    nullif(payload->>'customer_id', '')::uuid,
    payload->>'customer_name',
    payload->>'customer_email',
    payload->>'customer_phone',
    payload->>'customer_address'
  );

  begin
    insert into public.booking_inquiries (
      organization_id,
      client_request_id,
      customer_id,
      property_id,
      event_type,
      fest_type,
      preferred_event_date,
      preferred_event_end_date,
      guest_count,
      estimated_total,
      status,
      next_follow_up_at,
      internal_notes
    )
    values (
      v_org,
      v_request_id,
      v_customer_id,
      nullif(payload->>'property_id', '')::uuid,
      coalesce(nullif(payload->>'event_type', ''), 'other'),
      nullif(payload->>'fest_type', ''),
      nullif(payload->>'preferred_event_date', '')::date,
      nullif(payload->>'preferred_event_end_date', '')::date,
      coalesce((payload->>'guest_count')::integer, 1),
      nullif(payload->>'estimated_total', '')::numeric,
      coalesce(nullif(payload->>'status', ''), 'new'),
      nullif(payload->>'next_follow_up_at', '')::timestamptz,
      nullif(payload->>'internal_notes', '')
    )
    returning id into v_inquiry_id;
  exception
    when unique_violation then
      select bi.id, bi.customer_id into v_inquiry_id, v_customer_id
      from public.booking_inquiries bi
      where bi.organization_id = v_org
        and bi.client_request_id = v_request_id
      limit 1;
      if v_inquiry_id is null then
        raise;
      end if;
      v_reused := true;
  end;

  return jsonb_build_object(
    'customerId', v_customer_id,
    'reservationId', v_inquiry_id,
    'inquiryId', v_inquiry_id,
    'reused', v_reused
  );
end;
$$;

create or replace function public.create_accommodation_reservation_atomic (payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid;
  v_request_id uuid;
  v_customer_id uuid;
  v_reservation_id uuid;
  v_existing_id uuid;
  v_reused boolean := false;
  v_unit_org uuid;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_request_id := nullif(payload->>'client_request_id', '')::uuid;

  if v_request_id is null then
    raise exception 'client_request_id_required';
  end if;

  perform public.assert_can_write_reservations (v_org);

  select ar.id into v_existing_id
  from public.accommodation_reservations ar
  where ar.organization_id = v_org
    and ar.client_request_id = v_request_id
  limit 1;

  if v_existing_id is not null then
    select ar.customer_id into v_customer_id
    from public.accommodation_reservations ar
    where ar.id = v_existing_id;
    return jsonb_build_object(
      'customerId', v_customer_id,
      'reservationId', v_existing_id,
      'reused', true
    );
  end if;

  select u.organization_id into v_unit_org
  from public.accommodation_units u
  where u.id = nullif(payload->>'unit_id', '')::uuid;

  if v_unit_org is null then
    raise exception 'unit_not_found';
  end if;
  if v_unit_org is distinct from v_org then
    raise exception 'unit_org_mismatch';
  end if;

  v_customer_id := public.resolve_or_create_customer (
    v_org,
    nullif(payload->>'customer_id', '')::uuid,
    payload->>'customer_name',
    payload->>'customer_email',
    payload->>'customer_phone',
    payload->>'customer_address'
  );

  begin
    insert into public.accommodation_reservations (
      organization_id,
      client_request_id,
      unit_id,
      customer_id,
      check_in_date,
      check_out_date,
      check_in_time,
      check_out_time,
      status,
      guest_count,
      notes,
      total_price
    )
    values (
      v_org,
      v_request_id,
      (payload->>'unit_id')::uuid,
      v_customer_id,
      (payload->>'check_in_date')::date,
      (payload->>'check_out_date')::date,
      nullif(payload->>'check_in_time', '')::time,
      nullif(payload->>'check_out_time', '')::time,
      coalesce(nullif(payload->>'status', ''), 'confirmed'),
      coalesce((payload->>'guest_count')::integer, 1),
      nullif(payload->>'notes', ''),
      nullif(payload->>'total_price', '')::numeric
    )
    returning id into v_reservation_id;
  exception
    when unique_violation then
      select ar.id, ar.customer_id into v_reservation_id, v_customer_id
      from public.accommodation_reservations ar
      where ar.organization_id = v_org
        and ar.client_request_id = v_request_id
      limit 1;
      if v_reservation_id is null then
        raise;
      end if;
      v_reused := true;
  end;

  return jsonb_build_object(
    'customerId', v_customer_id,
    'reservationId', v_reservation_id,
    'reused', v_reused
  );
end;
$$;

create or replace function public.create_customer_atomic (payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org uuid;
  v_customer_id uuid;
  v_email text;
  v_reused boolean := false;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_email := nullif(lower(trim(coalesce(payload->>'customer_email', ''))), '');

  perform public.assert_can_write_reservations (v_org);

  if v_email is not null then
    select c.id into v_customer_id
    from public.customers c
    where c.organization_id = v_org
      and lower(trim(c.email)) = v_email
    limit 1;
    if v_customer_id is not null then
      v_reused := true;
    end if;
  end if;

  v_customer_id := public.resolve_or_create_customer (
    v_org,
    null,
    payload->>'customer_name',
    payload->>'customer_email',
    payload->>'customer_phone',
    payload->>'customer_address'
  );

  return jsonb_build_object(
    'customerId', v_customer_id,
    'reused', v_reused
  );
end;
$$;

revoke all on function public.assert_can_write_reservations (uuid) from public;
revoke all on function public.resolve_or_create_customer (uuid, uuid, text, text, text, text) from public;
revoke all on function public.create_booking_atomic (jsonb) from public;
revoke all on function public.create_inquiry_atomic (jsonb) from public;
revoke all on function public.create_accommodation_reservation_atomic (jsonb) from public;
revoke all on function public.create_customer_atomic (jsonb) from public;

grant execute on function public.assert_can_write_reservations (uuid) to authenticated, service_role;
grant execute on function public.resolve_or_create_customer (uuid, uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.create_booking_atomic (jsonb) to authenticated, service_role;
grant execute on function public.create_inquiry_atomic (jsonb) to authenticated, service_role;
grant execute on function public.create_accommodation_reservation_atomic (jsonb) to authenticated, service_role;
grant execute on function public.create_customer_atomic (jsonb) to authenticated, service_role;
