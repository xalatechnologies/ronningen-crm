-- Extend the tenant audit trail (see 20261110180000_tenant_audit_log.sql) to the rest of what staff
-- edit in the dashboard, so deletes are visible too: inquiries (forespørsler), accommodation
-- reservations and units, packages, services, assets and venues. Additive: only new AFTER triggers
-- on existing tables; no existing data is changed.
--
-- A table is only attached when it exists AND has an organization_id column, because
-- audit_row_change() needs it (audit_log.organization_id is NOT NULL).
-- Not covered on purpose: contract tables (contract_events is already their trail and the signing
-- flow writes many internal rows) and booking_line_items (the booking row changes already show it).

do $$
declare
  t text;
begin
  foreach t in array array[
    'booking_inquiries',
    'accommodation_reservations',
    'accommodation_units',
    'packages',
    'services',
    'assets',
    'properties'
  ]
  loop
    if to_regclass ('public.' || t) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'organization_id'
       )
    then
      execute format ('drop trigger if exists audit_row_change on public.%I', t);
      execute format (
        'create trigger audit_row_change after insert or update or delete on public.%I
         for each row execute function public.audit_row_change ()',
        t
      );
    end if;
  end loop;
end
$$;
