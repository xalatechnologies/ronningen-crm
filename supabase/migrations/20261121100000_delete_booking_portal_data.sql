-- Deleting a booking failed once a customer portal existed for it ("portal_accounts_booking_fk"):
-- the portal tables reference bookings with ON DELETE RESTRICT, and delete_booking_with_contracts() did not
-- remove them. It now deletes the booking's portal data (messages, wishes and quotes, day plans, guests,
-- invitation card, activities, portal accounts) in the same transaction, before the booking.
-- Everything else in the function is unchanged (owner/admin only, refuses signed contracts).
--
-- NOT APPLIED automatically. Review, then apply deliberately.

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
  -- Customer portal data of this booking (children first; guest tokens and activity answers cascade).
  delete from public.portal_guest_emails where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_activities where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_guests where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_invite_designs where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_messages where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_wish_counters where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_wish_quotes where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_wish_items where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_schedule_versions where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_schedule_items where booking_id = p_booking and organization_id = p_org;
  delete from public.portal_accounts where booking_id = p_booking and organization_id = p_org;
  delete from public.bookings where id = p_booking and organization_id = p_org;

  perform set_config('app.allow_contract_delete', 'off', true);
  return v_paths;
end;
$$;

revoke all on function public.delete_booking_with_contracts (uuid, uuid) from public, anon;
grant execute on function public.delete_booking_with_contracts (uuid, uuid) to authenticated;
