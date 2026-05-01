-- Idempotent repair for remote DBs where earlier migrations were skipped or applied out of order.
-- Matches app usage in src/components/bookings/new-booking-form.tsx:
--   customers: name, phone, email, address (insert/update)
--   bookings: … fest_type, booking_reference (valgfri egen ID / saksnummer), …

alter table public.customers
  add column if not exists address text;

alter table public.bookings
  add column if not exists fest_type text;

alter table public.bookings
  add column if not exists booking_reference text;

-- Tillat booking uten valgt lokale (app sender property_id: null)
alter table public.bookings
  alter column property_id drop not null;

notify pgrst, 'reload schema';
