-- Fakturaoppfølging: eksplisitt forfallsdato og registrering av inkassovarsel.

alter table public.bookings
  add column if not exists payment_due_date date;

alter table public.bookings
  add column if not exists collection_notice_sent_at timestamptz;

comment on column public.bookings.payment_due_date is
  'Valgfritt fakturaforfall. Dersom null bruker appen arrangementsdato som praktisk referanse.';

comment on column public.bookings.collection_notice_sent_at is
  'Når innkassovarsel er registrert sendt (manuell markering i CRM).';
