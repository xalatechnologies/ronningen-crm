-- Additive booking/customer fields so reservations stay source of truth
-- for digital rental contracts. Does not parse or rewrite historical notes.

alter table public.customers
  add column if not exists company_name text,
  add column if not exists company_org_number text,
  add column if not exists signing_representative_name text,
  add column if not exists signing_representative_title text;

alter table public.bookings
  add column if not exists kitchen_access text not null default 'unknown',
  add column if not exists rental_start_date date,
  add column if not exists rental_end_date date,
  add column if not exists rental_start_time time,
  add column if not exists rental_end_time time,
  add column if not exists timezone text not null default 'Europe/Oslo',
  add column if not exists signer_name text,
  add column if not exists signer_title text;

alter table public.bookings
  drop constraint if exists bookings_kitchen_access_check;

alter table public.bookings
  add constraint bookings_kitchen_access_check
  check (kitchen_access in ('included', 'excluded', 'unknown'));

alter table public.organizations
  add column if not exists legal_terms_approved_at timestamptz,
  add column if not exists contracts_enabled boolean not null default false,
  add column if not exists default_contract_expiry_days integer not null default 14,
  add column if not exists default_timezone text not null default 'Europe/Oslo';

alter table public.organizations
  drop constraint if exists organizations_default_contract_expiry_days_check;

alter table public.organizations
  add constraint organizations_default_contract_expiry_days_check
  check (default_contract_expiry_days between 1 and 365);

-- Composite keys so child rows cannot point at another tenant's parent.
alter table public.bookings
  drop constraint if exists bookings_organization_id_id_key;
alter table public.bookings
  add constraint bookings_organization_id_id_key unique (organization_id, id);

alter table public.customers
  drop constraint if exists customers_organization_id_id_key;
alter table public.customers
  add constraint customers_organization_id_id_key unique (organization_id, id);

alter table public.packages
  drop constraint if exists packages_organization_id_id_key;
alter table public.packages
  add constraint packages_organization_id_id_key unique (organization_id, id);

alter table public.services
  drop constraint if exists services_organization_id_id_key;
alter table public.services
  add constraint services_organization_id_id_key unique (organization_id, id);

create table if not exists public.booking_line_items (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  kind text not null,
  catalog_id uuid,
  name text not null,
  quantity numeric(12, 2) not null default 1,
  unit_amount_nok numeric(14, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_line_items_kind_check
    check (kind in ('package', 'addon', 'kitchen', 'custom', 'adjustment')),
  constraint booking_line_items_qty_check check (quantity > 0),
  constraint booking_line_items_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create index if not exists booking_line_items_booking_idx
  on public.booking_line_items (organization_id, booking_id, sort_order);

create table if not exists public.booking_payment_installments (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  label text not null,
  amount_nok numeric(14, 2) not null,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_payment_installments_amount_check check (amount_nok >= 0),
  constraint booking_payment_installments_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete cascade
);

create index if not exists booking_payment_installments_booking_idx
  on public.booking_payment_installments (organization_id, booking_id, sort_order);

comment on table public.booking_payment_installments is
  'Scheduled amounts only. Editing these rows must not change bookings.paid_amount.';

alter table public.booking_line_items enable row level security;
alter table public.booking_payment_installments enable row level security;

create policy "org_select_booking_line_items"
on public.booking_line_items for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_write_booking_line_items"
on public.booking_line_items for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']))
with check (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create policy "org_select_booking_payment_installments"
on public.booking_payment_installments for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_write_booking_payment_installments"
on public.booking_payment_installments for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']))
with check (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create or replace function public.replace_booking_commercial_children (
  p_org uuid,
  p_booking uuid,
  p_line_items jsonb,
  p_installments jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_sort integer := 0;
begin
  delete from public.booking_line_items
  where organization_id = p_org and booking_id = p_booking;

  delete from public.booking_payment_installments
  where organization_id = p_org and booking_id = p_booking;

  if p_line_items is not null and jsonb_typeof(p_line_items) = 'array' then
    for v_item in select value from jsonb_array_elements(p_line_items)
    loop
      insert into public.booking_line_items (
        organization_id, booking_id, kind, catalog_id, name, quantity, unit_amount_nok, sort_order
      ) values (
        p_org,
        p_booking,
        coalesce(nullif(v_item->>'kind', ''), 'custom'),
        nullif(v_item->>'catalog_id', '')::uuid,
        coalesce(nullif(v_item->>'name', ''), 'Linje'),
        coalesce((v_item->>'quantity')::numeric, 1),
        coalesce((v_item->>'unit_amount_nok')::numeric, 0),
        coalesce((v_item->>'sort_order')::integer, v_sort)
      );
      v_sort := v_sort + 1;
    end loop;
  end if;

  v_sort := 0;
  if p_installments is not null and jsonb_typeof(p_installments) = 'array' then
    for v_item in select value from jsonb_array_elements(p_installments)
    loop
      insert into public.booking_payment_installments (
        organization_id, booking_id, label, amount_nok, due_date, sort_order
      ) values (
        p_org,
        p_booking,
        coalesce(nullif(v_item->>'label', ''), 'Forfall'),
        coalesce((v_item->>'amount_nok')::numeric, 0),
        nullif(v_item->>'due_date', '')::date,
        coalesce((v_item->>'sort_order')::integer, v_sort)
      );
      v_sort := v_sort + 1;
    end loop;
  end if;
end;
$$;

revoke all on function public.replace_booking_commercial_children (uuid, uuid, jsonb, jsonb) from public;
grant execute on function public.replace_booking_commercial_children (uuid, uuid, jsonb, jsonb)
  to authenticated, service_role;

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

  update public.customers c
  set
    company_name = coalesce(nullif(payload->>'company_name', ''), c.company_name),
    company_org_number = coalesce(nullif(payload->>'company_org_number', ''), c.company_org_number),
    signing_representative_name = coalesce(nullif(payload->>'signer_name', ''), c.signing_representative_name),
    signing_representative_title = coalesce(nullif(payload->>'signer_title', ''), c.signing_representative_title),
    updated_at = now()
  where c.id = v_customer_id
    and c.organization_id = v_org;

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
      payment_status,
      kitchen_access,
      rental_start_date,
      rental_end_date,
      rental_start_time,
      rental_end_time,
      timezone,
      signer_name,
      signer_title
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
      coalesce(nullif(payload->>'payment_status', ''), 'unpaid'),
      coalesce(nullif(payload->>'kitchen_access', ''), 'unknown'),
      nullif(payload->>'rental_start_date', '')::date,
      nullif(payload->>'rental_end_date', '')::date,
      nullif(payload->>'rental_start_time', '')::time,
      nullif(payload->>'rental_end_time', '')::time,
      coalesce(nullif(payload->>'timezone', ''), 'Europe/Oslo'),
      nullif(payload->>'signer_name', ''),
      nullif(payload->>'signer_title', '')
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

  if not v_reused then
    perform public.replace_booking_commercial_children (
      v_org,
      v_booking_id,
      payload->'line_items',
      payload->'installments'
    );
  end if;

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
