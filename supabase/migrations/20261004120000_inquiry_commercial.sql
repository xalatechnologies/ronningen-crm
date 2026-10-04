-- Package and add-ons chosen on a forespørsel, carried into the reservation on convert.
alter table public.booking_inquiries
  add column if not exists commercial jsonb;

comment on column public.booking_inquiries.commercial is
  'Pakke og tillegg valgt på forespørselen (katalog-id-er og egne linjer).';
