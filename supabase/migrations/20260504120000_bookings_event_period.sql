-- Arrangementsperiode: valgfri sluttdato og klokkeslett (start er fortsatt event_date).
alter table public.bookings
  add column if not exists event_end_date date;
alter table public.bookings
  add column if not exists event_start_time text;
alter table public.bookings
  add column if not exists event_end_time text;

comment on column public.bookings.event_end_date is
  'Siste dag i perioden (inkludert). Null = samme dag som event_date.';
comment on column public.bookings.event_start_time is
  'Startklokkeslett lokal tid, HH:MM (24h).';
comment on column public.bookings.event_end_time is
  'Sluttklokkeslett lokal tid, HH:MM (24h).';
