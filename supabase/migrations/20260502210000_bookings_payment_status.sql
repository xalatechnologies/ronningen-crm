-- Manuell betalingsstatus (CRM) uavhengig av rene beløp; styrer bl.a. fakturaliste.

alter table public.bookings
  add column if not exists payment_status text;

comment on column public.bookings.payment_status is
  'Manuell status: unpaid | partial | paid | waived | disputed | other. Tom = utled fra beløp i app.';

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
