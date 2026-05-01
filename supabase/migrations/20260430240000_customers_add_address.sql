-- Customer postal / street address for CRM and bookings.
alter table public.customers
  add column if not exists address text;
