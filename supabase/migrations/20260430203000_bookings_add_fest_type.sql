-- Optional fest type (preset or free text via form) for bookings.
alter table public.bookings add column if not exists fest_type text;
