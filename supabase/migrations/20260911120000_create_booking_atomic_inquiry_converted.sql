-- Additive: report whether inquiry→booking convert actually linked.
-- Do not rewrite prior reservation_create_reliability migration.

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
  v_inquiry_converted boolean := false;
  v_convert_count integer := 0;
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
      'reused', true,
      'inquiryConverted', null
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
    get diagnostics v_convert_count = row_count;
    v_inquiry_converted := v_convert_count > 0;
  end if;

  return jsonb_build_object(
    'customerId', v_customer_id,
    'reservationId', v_booking_id,
    'bookingId', v_booking_id,
    'reused', v_reused,
    'inquiryConverted', case
      when v_inquiry_id is null then null
      else v_inquiry_converted
    end
  );
end;
$$;
