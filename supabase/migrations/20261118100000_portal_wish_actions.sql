-- Customer portal: every wishlist state change as ONE atomic database function.
--
-- Before, the server did several separate writes per change (item status, close old quote, insert new quote,
-- settle counter) and tried to undo them by hand when one failed. A crash or a race between two requests could
-- leave an item "quoted" without an active quote, or two actors winning. Here the item row is locked
-- (select ... for update) and every write happens in one transaction: all of it applies or none of it.
--
-- Additive: one new function. Server code stays responsible for WHO may call it (customer session or venue
-- staff); the function re-checks the state machine and the quote the caller saw. Only service_role may execute.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create or replace function public.portal_wish_act (
  p_org uuid,
  p_booking_id uuid,
  p_item_id uuid,
  p_actor text,        -- 'customer' | 'staff'
  p_action text,
  p_user uuid,
  p_args jsonb default '{}'::jsonb
)
returns text           -- 'ok' | 'not_found' | 'wrong_state' | 'expired' | 'limit' | 'invalid'
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.portal_wish_items%rowtype;
  v_today date := (now () at time zone 'Europe/Oslo')::date;
  v_quote public.portal_wish_quotes%rowtype;
  v_counter public.portal_wish_counters%rowtype;
  v_unit numeric;
  v_rounds integer;
begin
  if p_actor not in ('customer', 'staff') then
    return 'invalid';
  end if;

  select * into v
  from public.portal_wish_items
  where id = p_item_id and booking_id = p_booking_id and organization_id = p_org
  for update;
  if not found then
    return 'not_found';
  end if;

  -- ------------------------------------------------------------------ customer
  if p_actor = 'customer' then
    if p_action in ('approve', 'decline') then
      if v.status <> 'quoted' then return 'wrong_state'; end if;
      select * into v_quote from public.portal_wish_quotes where wish_item_id = v.id and status = 'active';
      if not found or v_quote.id is distinct from (p_args ->> 'quote_id')::uuid then return 'wrong_state'; end if;
      if p_action = 'approve' and v_quote.valid_until is not null and v_quote.valid_until < v_today then
        return 'expired';
      end if;
      update public.portal_wish_items
        set status = case when p_action = 'approve' then 'approved' else 'declined' end, updated_at = now ()
        where id = v.id;
      return 'ok';

    elsif p_action = 'counter' then
      if v.status <> 'quoted' then return 'wrong_state'; end if;
      select * into v_quote from public.portal_wish_quotes where wish_item_id = v.id and status = 'active';
      if not found or v_quote.id is distinct from (p_args ->> 'quote_id')::uuid then return 'wrong_state'; end if;
      if v_quote.valid_until is not null and v_quote.valid_until < v_today then return 'expired'; end if;
      select count (*) into v_rounds
        from public.portal_wish_counters where wish_item_id = v.id and revision = v.revision;
      if v_rounds >= 3 then return 'limit'; end if;
      update public.portal_wish_items set status = 'countered', updated_at = now () where id = v.id;
      insert into public.portal_wish_counters (
        organization_id, booking_id, wish_item_id, quote_id, revision, proposed_unit_price_nok, note, created_by
      ) values (
        v.organization_id, v.booking_id, v.id, v_quote.id, v.revision,
        (p_args ->> 'unit_price')::numeric, nullif (p_args ->> 'note', ''), p_user
      );
      return 'ok';

    elsif p_action = 'withdraw' then
      if v.status not in ('requested', 'quoted', 'countered') then return 'wrong_state'; end if;
      update public.portal_wish_items set status = 'withdrawn', updated_at = now () where id = v.id;

    elsif p_action = 'revise' then
      if v.status not in ('requested', 'quoted', 'countered') then return 'wrong_state'; end if;
      update public.portal_wish_items set
        status = 'requested',
        category = p_args ->> 'category',
        title = p_args ->> 'title',
        description = nullif (p_args ->> 'description', ''),
        quantity = (p_args ->> 'quantity')::numeric,
        unit = nullif (p_args ->> 'unit', ''),
        revision = v.revision + 1,
        updated_at = now ()
        where id = v.id;

    elsif p_action = 'reopen' then
      if v.status not in ('unavailable', 'declined', 'withdrawn') then return 'wrong_state'; end if;
      update public.portal_wish_items set status = 'draft', revision = v.revision + 1, updated_at = now () where id = v.id;

    else
      return 'invalid';
    end if;

    -- withdraw / revise / reopen: void the quote and counter of the revision that just ended.
    update public.portal_wish_quotes set status = 'superseded'
      where wish_item_id = v.id and status = 'active' and revision <= v.revision;
    update public.portal_wish_counters set status = 'superseded', answered_at = now ()
      where wish_item_id = v.id and status = 'open' and revision <= v.revision;
    return 'ok';
  end if;

  -- --------------------------------------------------------------------- staff
  if p_action = 'quote' then
    if v.status not in ('requested', 'quoted', 'countered') then return 'wrong_state'; end if;
    v_unit := (p_args ->> 'unit_price')::numeric;
    if (p_args ->> 'valid_until') is not null and (p_args ->> 'valid_until')::date < v_today then
      return 'invalid';
    end if;
    -- quote_seq + 1: a customer answer to the previous quote now fails its version check.
    update public.portal_wish_items set status = 'quoted', quote_seq = v.quote_seq + 1, updated_at = now () where id = v.id;
    update public.portal_wish_quotes set status = 'superseded' where wish_item_id = v.id and status = 'active';
    insert into public.portal_wish_quotes (
      organization_id, booking_id, wish_item_id, revision, unit_price_nok, total_nok, vat_included,
      note, valid_until, source, quoted_by
    ) values (
      v.organization_id, v.booking_id, v.id, v.revision, v_unit, round (v_unit * v.quantity, 2),
      coalesce ((p_args ->> 'vat_included')::boolean, true), nullif (p_args ->> 'note', ''),
      (p_args ->> 'valid_until')::date, 'staff', p_user
    );
    update public.portal_wish_counters set status = 'superseded', answered_by = p_user, answered_at = now ()
      where wish_item_id = v.id and status = 'open';
    return 'ok';

  elsif p_action = 'unavailable' then
    if v.status not in ('requested', 'quoted', 'countered') then return 'wrong_state'; end if;
    update public.portal_wish_items set status = 'unavailable', updated_at = now () where id = v.id;
    update public.portal_wish_quotes set status = 'superseded'
      where wish_item_id = v.id and status = 'active' and revision <= v.revision;
    update public.portal_wish_counters set status = 'superseded', answered_by = p_user, answered_at = now ()
      where wish_item_id = v.id and status = 'open' and revision <= v.revision;
    return 'ok';

  elsif p_action = 'accept_counter' then
    if v.status <> 'countered' then return 'wrong_state'; end if;
    select * into v_counter from public.portal_wish_counters where wish_item_id = v.id and status = 'open';
    if not found then return 'wrong_state'; end if;
    select * into v_quote from public.portal_wish_quotes where wish_item_id = v.id and status = 'active';
    if not found then return 'wrong_state'; end if;
    update public.portal_wish_items set status = 'approved', quote_seq = v.quote_seq + 1, updated_at = now () where id = v.id;
    update public.portal_wish_quotes set status = 'superseded' where id = v_quote.id;
    insert into public.portal_wish_quotes (
      organization_id, booking_id, wish_item_id, revision, unit_price_nok, total_nok, vat_included, source, quoted_by
    ) values (
      v.organization_id, v.booking_id, v.id, v.revision, v_counter.proposed_unit_price_nok,
      round (v_counter.proposed_unit_price_nok * v.quantity, 2), v_quote.vat_included, 'counter', p_user
    );
    update public.portal_wish_counters set status = 'accepted', answered_by = p_user, answered_at = now ()
      where id = v_counter.id;
    return 'ok';

  elsif p_action = 'reject_counter' then
    if v.status <> 'countered' then return 'wrong_state'; end if;
    update public.portal_wish_items set status = 'quoted', updated_at = now () where id = v.id;
    update public.portal_wish_counters set status = 'rejected', answered_by = p_user, answered_at = now ()
      where wish_item_id = v.id and status = 'open';
    return 'ok';
  end if;

  return 'invalid';
end;
$$;

revoke all on function public.portal_wish_act (uuid, uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.portal_wish_act (uuid, uuid, uuid, text, text, uuid, jsonb) to service_role;
