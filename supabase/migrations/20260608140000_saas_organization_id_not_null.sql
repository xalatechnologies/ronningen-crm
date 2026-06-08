-- SaaS: NOT NULL organization_id + compound indexes (safe on empty/fresh DB).

alter table public.properties alter column organization_id set not null;
alter table public.customers alter column organization_id set not null;
alter table public.partners alter column organization_id set not null;
alter table public.bookings alter column organization_id set not null;
alter table public.packages alter column organization_id set not null;
alter table public.services alter column organization_id set not null;
alter table public.transactions alter column organization_id set not null;
alter table public.assets alter column organization_id set not null;
alter table public.booking_inquiries alter column organization_id set not null;
alter table public.accommodation_units alter column organization_id set not null;
alter table public.accommodation_reservations alter column organization_id set not null;

create index if not exists idx_bookings_organization_id_event_date
  on public.bookings (organization_id, event_date);

create index if not exists idx_bookings_organization_id_status
  on public.bookings (organization_id, status);

create index if not exists idx_customers_organization_id_name
  on public.customers (organization_id, name);

create index if not exists idx_customers_organization_id_email
  on public.customers (organization_id, email);

create index if not exists idx_transactions_organization_id_transaction_date
  on public.transactions (organization_id, transaction_date);

create index if not exists idx_transactions_organization_id_type
  on public.transactions (organization_id, type);

create index if not exists idx_assets_organization_id_property_id
  on public.assets (organization_id, property_id);
