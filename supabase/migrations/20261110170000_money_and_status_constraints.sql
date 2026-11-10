-- Data-integrity constraints for money and status columns. No data is changed; every value
-- currently in production already satisfies these (verified read-only before writing).
--
-- Deliberately NOT constrained:
--   * bookings.remaining_amount = total_price - paid_amount: waived bookings store remaining = 0.
--   * bookings.event_type / fest_type, transactions.category: free-form user text.

alter table public.bookings drop constraint if exists bookings_status_chk;
alter table public.bookings
  add constraint bookings_status_chk check (status in ('pending', 'confirmed', 'cancelled'));

alter table public.bookings drop constraint if exists bookings_money_chk;
alter table public.bookings
  add constraint bookings_money_chk check (
    total_price >= 0
    and paid_amount >= 0
    and remaining_amount >= 0
    and paid_amount <= total_price
  );

alter table public.transactions drop constraint if exists transactions_type_chk;
alter table public.transactions
  add constraint transactions_type_chk check (type in ('income', 'expense'));

alter table public.transactions drop constraint if exists transactions_amount_chk;
alter table public.transactions
  add constraint transactions_amount_chk check (amount >= 0);

alter table public.packages drop constraint if exists packages_price_chk;
alter table public.packages
  add constraint packages_price_chk check (price >= 0);

alter table public.services drop constraint if exists services_price_chk;
alter table public.services
  add constraint services_price_chk check (price >= 0);

alter table public.assets drop constraint if exists assets_value_chk;
alter table public.assets
  add constraint assets_value_chk check (value >= 0);
