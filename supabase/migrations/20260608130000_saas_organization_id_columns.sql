-- SaaS: organization_id on tenant tables (nullable until org onboarding).

alter table public.properties
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.customers
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.partners
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.bookings
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.packages
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.services
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.transactions
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.assets
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.booking_inquiries
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.accommodation_units
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

alter table public.accommodation_reservations
add column if not exists organization_id uuid references public.organizations (id) on delete restrict;

-- Remove demo accommodation units from base schema (no organization yet).
delete from public.accommodation_reservations;
delete from public.accommodation_units where organization_id is null;

create index if not exists properties_organization_id_idx on public.properties (organization_id);
create index if not exists customers_organization_id_idx on public.customers (organization_id);
create index if not exists partners_organization_id_idx on public.partners (organization_id);
create index if not exists bookings_organization_id_idx on public.bookings (organization_id);
create index if not exists packages_organization_id_idx on public.packages (organization_id);
create index if not exists services_organization_id_idx on public.services (organization_id);
create index if not exists transactions_organization_id_idx on public.transactions (organization_id);
create index if not exists assets_organization_id_idx on public.assets (organization_id);
create index if not exists booking_inquiries_organization_id_idx on public.booking_inquiries (organization_id);
create index if not exists accommodation_units_organization_id_idx on public.accommodation_units (organization_id);
create index if not exists accommodation_reservations_organization_id_idx
  on public.accommodation_reservations (organization_id);
