-- Intentionally empty. This migration used to create a dev admin user (admin@ronningen.no) with a hardcoded password in auth.users.
-- It moved to supabase/seed.sql (local only). It was never applied to production.
select 1;
