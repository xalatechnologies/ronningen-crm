-- Bookings may be created without a chosen property/venue.
alter table public.bookings alter column property_id drop not null;
