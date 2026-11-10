-- Tenant audit trail: who changed or deleted bookings, customers, transactions, payment
-- installments and organization members. Additive: new table + AFTER triggers; no existing data
-- is changed.
--
-- * Append-only: API roles cannot insert, update or delete. Only the trigger writes rows.
-- * Readable by owners/admins of the same organization only (platform admins use service role).
-- * UPDATE logs only the changed fields (old/new) and ignores updated_at-only changes.
-- * Tables marked 'redact' (customers: personal data) log which fields changed, never the values,
--   so the audit log does not keep personal data after an erasure request.
-- * A purge for retention needs a superuser/postgres session on purpose.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  table_name text not null,
  row_id text,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  actor_user_id uuid default auth.uid (),
  actor_role text not null default current_user,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx
  on public.audit_log (organization_id, created_at desc);
create index if not exists audit_log_org_row_idx
  on public.audit_log (organization_id, table_name, row_id);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_owner_admin" on public.audit_log;
create policy "audit_log_select_owner_admin"
on public.audit_log for select to authenticated
using ((select public.has_org_role (organization_id, array['owner', 'admin'])));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.audit_log_block_mutation ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon', 'service_role') then
    raise exception 'audit_log is append-only' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_log_block_mutation on public.audit_log;
create trigger audit_log_block_mutation
before update or delete on public.audit_log
for each row execute function public.audit_log_block_mutation ();

create or replace function public.audit_row_change ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redact boolean := coalesce(tg_argv[0], '') = 'redact';
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changed text[];
begin
  if tg_op = 'INSERT' then
    v_row := to_jsonb (new);
  elsif tg_op = 'DELETE' then
    v_row := to_jsonb (old);
  else
    v_old := to_jsonb (old);
    v_new := to_jsonb (new);
    v_row := v_new;
    select coalesce(array_agg(n.key order by n.key), '{}') into v_changed
    from jsonb_each (v_new) n
    where n.key <> 'updated_at' and n.value is distinct from v_old -> n.key;
    if cardinality (v_changed) = 0 then
      return null;
    end if;
  end if;

  insert into public.audit_log (organization_id, table_name, row_id, op, changed_fields, old_data, new_data)
  values (
    (v_row ->> 'organization_id')::uuid,
    tg_table_name,
    v_row ->> 'id',
    tg_op,
    v_changed,
    case
      when v_redact then null
      when tg_op = 'UPDATE' then (select jsonb_object_agg(k, v_old -> k) from unnest (v_changed) k)
      when tg_op = 'DELETE' then v_row
    end,
    case
      when v_redact then null
      when tg_op = 'UPDATE' then (select jsonb_object_agg(k, v_new -> k) from unnest (v_changed) k)
      when tg_op = 'INSERT' then v_row
    end
  );
  return null;
end;
$$;

revoke all on function public.audit_row_change () from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('bookings', ''),
      ('transactions', ''),
      ('booking_payment_installments', ''),
      ('organization_members', ''),
      ('customers', 'redact')
    ) as v (tbl, arg)
  loop
    if to_regclass ('public.' || t.tbl) is not null then
      execute format ('drop trigger if exists audit_row_change on public.%I', t.tbl);
      execute format (
        'create trigger audit_row_change after insert or update or delete on public.%I
         for each row execute function public.audit_row_change (%L)',
        t.tbl, t.arg
      );
    end if;
  end loop;
end
$$;
