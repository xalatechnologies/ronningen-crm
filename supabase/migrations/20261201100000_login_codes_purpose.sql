-- One-time e-mail codes now also prove ownership of a mailbox at signup, before any account exists.
--
-- Additive only: one new column with a default, so every existing row and every running instance of the old
-- code keeps working (old rows and old inserts become purpose 'login').
-- The purpose keeps the two uses apart: a signup code must never be accepted as a sign-in code (that path
-- creates a session for the e-mail), and a sign-in code must never be accepted for signup.

alter table public.login_codes
  add column if not exists purpose text not null default 'login'
  check (purpose in ('login', 'signup'));
