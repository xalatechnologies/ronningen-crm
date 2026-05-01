-- ---------------------------------------------------------------------------
-- Engangs-reparasjon: kjør i Supabase Dashboard → SQL Editor for prosjektet
-- som brukes i .env.local (dersom du får "Could not find the 'booking_reference'
-- column ... in the schema cache" eller tilsvarende).
--
-- Dekker bl.a. Ny booking-skjemaet og fakturaoppfølging:
--   customers: address
--   bookings: … payment_due_date, collection_notice_sent_at, payment_status
-- ---------------------------------------------------------------------------

alter table public.customers
  add column if not exists address text;

alter table public.bookings
  add column if not exists fest_type text;

alter table public.bookings
  add column if not exists booking_reference text;

-- Tillat booking uten valgt lokale (app sender property_id: null)
alter table public.bookings
  alter column property_id drop not null;

-- Fakturaer / booking-detalj: forfallsdato og registrert innkassovarsel
-- (fix: "column bookings.payment_due_date does not exist")
alter table public.bookings
  add column if not exists payment_due_date date;

alter table public.bookings
  add column if not exists collection_notice_sent_at timestamptz;

alter table public.bookings
  add column if not exists payment_status text;

alter table public.bookings
  drop constraint if exists bookings_payment_status_check;

alter table public.bookings
  add constraint bookings_payment_status_check check (
    payment_status is null
    or payment_status in (
      'unpaid',
      'partial',
      'paid',
      'waived',
      'disputed',
      'other'
    )
  );

-- Oppdater PostgREST / API schema cache (Supabase)
notify pgrst, 'reload schema';
