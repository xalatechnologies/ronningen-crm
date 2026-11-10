-- Intentionally empty. This migration used to insert 13 named customers (names, phones, emails) and their bookings.
-- Real customer data does not belong in schema migrations. The data is already in production;
use scripts/import-legacy-bookings.mjs for imports. A local copy is in supabase/private-seeds/ (gitignored).
select 1;
