-- Signed contracts are legal evidence (Norwegian bookkeeping rules: retain 5 years).
-- delete_booking_with_contracts() switched the immutability triggers off and erased accepted
-- contracts, their acceptance evidence and PDF paths. It now refuses when any contract version
-- on the booking was ever accepted (status accepted/superseded, or an acceptance row exists).
-- Drafts, cancelled and expired contracts can still be deleted with their booking, as before.
-- To get rid of a booking with a signed contract: cancel it (status = 'cancelled') instead.

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

  if exists (
    select 1
    from public.rental_contracts c
    join public.rental_contract_versions v on v.contract_id = c.id
    where c.booking_id = p_booking
      and c.organization_id = p_org
      and (
        v.status in ('accepted', 'superseded')
        or exists (select 1 from public.contract_acceptances a where a.version_id = v.id)
      )
  ) then
    raise exception 'booking_has_signed_contract';
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
