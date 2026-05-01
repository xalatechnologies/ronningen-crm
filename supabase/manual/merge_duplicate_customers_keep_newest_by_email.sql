-- Merge duplicate customer rows that share the same email, then delete extras.
-- Keeps the NEWEST row (created_at desc) — matches default list order on /app/customers.
-- Run in Supabase SQL Editor after backing up if needed.
--
-- Change the email literal to match your duplicates:

begin;

create temp table tmp_customer_merge as
with norm as (
  select id, created_at
  from public.customers
  where lower(trim(coalesce(email, ''))) = lower(trim('wahid@gmail.com'))
),
keeper as (
  select id as keeper_id
  from norm
  order by created_at desc nulls last, id desc
  limit 1
)
select n.id as victim_id, k.keeper_id
from norm n
cross join keeper k
where n.id <> k.keeper_id;

update public.bookings b
set customer_id = t.keeper_id
from tmp_customer_merge t
where b.customer_id = t.victim_id;

delete from public.customers c
using tmp_customer_merge t
where c.id = t.victim_id;

drop table tmp_customer_merge;

commit;

-- If PostgREST acts stale: notify pgrst, 'reload schema';
