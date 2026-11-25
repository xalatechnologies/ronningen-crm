-- Welcome tour: remembers on the account that the tour has been finished or closed, so it never returns
-- on any device. Null means "not yet seen".
--
-- Additive only: one nullable column, no default, no change to existing rows or policies.
-- Users set it on their own row through the existing self_update_profiles policy; the app only ever
-- writes it for the signed-in user (see src/features/welcome-tour/data/mark-tips-seen.ts).

alter table public.profiles
  add column if not exists tips_seen_at timestamptz;
