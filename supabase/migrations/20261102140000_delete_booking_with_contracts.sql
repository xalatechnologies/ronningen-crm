-- Allow owners/admins to permanently delete a booking together with its contract records.
-- The immutability triggers stay in force for every other code path; they only step aside
-- inside delete_booking_with_contracts() via a transaction-local flag.

create or replace function public.contract_prevent_mutation ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.allow_contract_delete', true) = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'immutable_contract_record';
end;
$$;

create or replace function public.contract_prevent_accepted_version_mutation ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.allow_contract_delete', true) = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'immutable_contract_record';
  end if;
  if old.status = 'accepted' then
    if new.status is distinct from old.status
      or new.frozen_document is distinct from old.frozen_document
      or new.content_hash is distinct from old.content_hash
      or new.special_terms is distinct from old.special_terms
      or new.payment_terms is distinct from old.payment_terms
      or new.document_overrides is distinct from old.document_overrides
      or new.accepted_at is distinct from old.accepted_at
    then
      raise exception 'accepted_version_immutable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_delete_booking_with_contracts ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.allow_contract_delete', true) = 'on' then
    return old;
  end if;
  if exists (
    select 1 from public.rental_contracts c
    where c.booking_id = old.id and c.organization_id = old.organization_id
  ) then
    raise exception 'booking_has_contract_history';
  end if;
  return old;
end;
$$;

create or replace function public.delete_booking_with_contracts (p_org uuid, p_booking uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_paths text[];
  v_contracts uuid[];
  v_versions uuid[];
begin
  select m.role into v_role
  from public.organization_members m
  where m.organization_id = p_org and m.user_id = auth.uid();
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.bookings b where b.id = p_booking and b.organization_id = p_org) then
    raise exception 'booking_not_found';
  end if;

  perform set_config('app.allow_contract_delete', 'on', true);

  select coalesce(array_agg(c.id), '{}') into v_contracts
  from public.rental_contracts c
  where c.booking_id = p_booking and c.organization_id = p_org;

  select coalesce(array_agg(v.id), '{}') into v_versions
  from public.rental_contract_versions v
  where v.contract_id = any (v_contracts) and v.organization_id = p_org;

  select coalesce(array_agg(a.storage_path), '{}') into v_paths
  from public.contract_artifacts a
  where a.version_id = any (v_versions) and a.organization_id = p_org;

  delete from public.contract_email_deliveries where version_id = any (v_versions);
  delete from public.contract_jobs where version_id = any (v_versions);
  delete from public.contract_access_tokens where version_id = any (v_versions);
  delete from public.contract_signing_sessions where version_id = any (v_versions);
  delete from public.contract_acceptances where version_id = any (v_versions);
  delete from public.contract_events where contract_id = any (v_contracts);
  delete from public.contract_artifacts where version_id = any (v_versions);
  update public.rental_contract_versions
    set replaces_version_id = null, expected_base_accepted_version_id = null
    where id = any (v_versions);
  delete from public.rental_contract_versions where id = any (v_versions);
  delete from public.rental_contracts where id = any (v_contracts);
  delete from public.bookings where id = p_booking and organization_id = p_org;

  perform set_config('app.allow_contract_delete', 'off', true);
  return v_paths;
end;
$$;

revoke all on function public.delete_booking_with_contracts (uuid, uuid) from public, anon;
grant execute on function public.delete_booking_with_contracts (uuid, uuid) to authenticated;
