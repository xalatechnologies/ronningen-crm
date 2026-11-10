-- Package/addon text frozen onto the booking so contracts keep the chosen inclusions.
alter table public.booking_line_items
  add column if not exists description text;

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
        organization_id, booking_id, kind, catalog_id, name, description, quantity, unit_amount_nok, sort_order
      ) values (
        p_org,
        p_booking,
        coalesce(nullif(v_item->>'kind', ''), 'custom'),
        nullif(v_item->>'catalog_id', '')::uuid,
        coalesce(nullif(v_item->>'name', ''), 'Linje'),
        nullif(v_item->>'description', ''),
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
