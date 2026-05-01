-- Optional human-readable booking id / case reference (system UUID remains primary key).
alter table public.bookings
  add column if not exists booking_reference text;

notify pgrst, 'reload schema';
