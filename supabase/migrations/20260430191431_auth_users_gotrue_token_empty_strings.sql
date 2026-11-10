-- Intentionally empty. This migration used to run an unscoped UPDATE on auth.users (a workaround for the dev admin seed).
-- The scoped version moved to supabase/seed.sql together with the dev admin.
select 1;
