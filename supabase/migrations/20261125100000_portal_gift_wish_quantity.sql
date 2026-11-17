-- Gift wishes: how many of a wish the couple wants (1-99). A wish stays available until every one is taken.
--
-- Additive for existing data: every existing wish gets quantity 1, which behaves exactly as before.
-- gift_wish_claims is now keyed by (wish, guest): several guests can take the same wish, one claim per guest.
-- APPLY THIS BEFORE deploying the code that reads/writes `quantity`.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

alter table public.gift_wishes add column if not exists quantity integer not null default 1;
alter table public.gift_wishes drop constraint if exists gift_wishes_quantity_check;
alter table public.gift_wishes add constraint gift_wishes_quantity_check check (quantity between 1 and 99);

-- Many givers per wish: the key is the pair, so the same guest still cannot take the same wish twice.
alter table public.gift_wish_claims drop constraint if exists gift_wish_claims_pkey;
alter table public.gift_wish_claims add primary key (wish_id, guest_id);
create index if not exists gift_wish_claims_wish_idx on public.gift_wish_claims (wish_id);

-- The couple cannot lower the number below what guests already took. The check reads the claims table, which
-- no client role can read, so the function runs with the owner's rights.
create or replace function public.gift_wishes_check_quantity ()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.quantity < (select count (*) from public.gift_wish_claims where wish_id = new.id) then
    raise exception 'quantity is lower than the number already taken' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists gift_wishes_check_quantity on public.gift_wishes;
create trigger gift_wishes_check_quantity
before update of quantity on public.gift_wishes
for each row
when (new.quantity is distinct from old.quantity)
execute function public.gift_wishes_check_quantity ();

grant select (quantity) on public.gift_wishes to authenticated;
grant insert (quantity) on public.gift_wishes to authenticated;
grant update (quantity) on public.gift_wishes to authenticated;

-- A guest takes one of the wish's places, atomically: the wish row is locked, so two guests taking the last
-- place cannot both succeed. Returns 'ok' | 'taken' (all places gone) | 'not_found' | 'limit'. Service role only.
create or replace function public.gift_wish_claim (p_guest_id uuid, p_wish_id uuid)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_booking uuid;
  v_quantity integer;
  v_taken integer;
  v_mine integer;
begin
  select booking_id into v_booking from public.portal_guests where id = p_guest_id;
  if v_booking is null then
    return 'not_found';
  end if;
  select quantity into v_quantity from public.gift_wishes where id = p_wish_id and booking_id = v_booking for update;
  if v_quantity is null or not exists (select 1 from public.gift_wish_settings s where s.booking_id = v_booking and s.shared) then
    return 'not_found';
  end if;
  if exists (select 1 from public.gift_wish_claims where wish_id = p_wish_id and guest_id = p_guest_id) then
    return 'ok';
  end if;
  select count (*) into v_mine from public.gift_wish_claims where guest_id = p_guest_id;
  if v_mine >= 10 then
    return 'limit';
  end if;
  select count (*) into v_taken from public.gift_wish_claims where wish_id = p_wish_id;
  if v_taken >= v_quantity then
    return 'taken';
  end if;
  insert into public.gift_wish_claims (wish_id, guest_id, booking_id) values (p_wish_id, p_guest_id, v_booking)
  on conflict do nothing;
  return 'ok';
end;
$$;

revoke all on function public.gift_wish_claim (uuid, uuid) from public, anon, authenticated;
grant execute on function public.gift_wish_claim (uuid, uuid) to service_role;
