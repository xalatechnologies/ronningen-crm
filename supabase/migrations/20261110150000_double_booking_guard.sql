-- Double-booking guard enforced by the database, not by app code. No data is changed.
--
-- Rule: one non-cancelled booking per property per day (inclusive range
-- event_date..event_end_date). Bookings without a property (legacy rows) are not covered.
-- Accommodation: the existing trigger check is racy under concurrent writes (two transactions
-- cannot see each other's uncommitted row); an exclusion constraint closes that gap.
-- Violations raise SQLSTATE 23P01 (exclusion_violation).

create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  drop constraint if exists bookings_event_period_chk;
alter table public.bookings
  add constraint bookings_event_period_chk
  check (event_end_date is null or event_end_date >= event_date);

alter table public.bookings
  drop constraint if exists bookings_no_double_booking;
alter table public.bookings
  add constraint bookings_no_double_booking
  exclude using gist (
    organization_id with =,
    property_id with =,
    daterange (event_date, coalesce (event_end_date, event_date), '[]') with &&
  )
  where (property_id is not null and status <> 'cancelled');

alter table public.accommodation_reservations
  drop constraint if exists accommodation_reservations_no_overlap;
alter table public.accommodation_reservations
  add constraint accommodation_reservations_no_overlap
  exclude using gist (
    unit_id with =,
    daterange (check_in_date, check_out_date, '[)') with &&
  )
  where (status in ('tentative', 'confirmed'));
