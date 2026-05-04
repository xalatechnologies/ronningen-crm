-- Valgfri innsjekk-/utsjekksklokkeslett (lokal tid), i tillegg til dato.

alter table public.accommodation_reservations
  add column if not exists check_in_time time without time zone null,
  add column if not exists check_out_time time without time zone null;

comment on column public.accommodation_reservations.check_in_time is
  'Valgfritt ankomstklokkeslett (lokal tid). Null = hele dagen.';

comment on column public.accommodation_reservations.check_out_time is
  'Valgfritt avreiseklokkeslett (lokal tid). Null = hele dagen.';
