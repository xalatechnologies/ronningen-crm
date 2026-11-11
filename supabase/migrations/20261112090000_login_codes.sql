-- One-time e-mail codes for «Logg inn med e-postkode».
--
-- Additive only: one new table, no change to existing tables.
-- Only a salted hash of the code is stored (never the code itself). Codes expire after 10 minutes,
-- allow 5 wrong attempts and can be used once.
-- RLS is enabled with NO policies on purpose: the table is only ever read and written server-side
-- with the service role, so the API (anon / authenticated) cannot see or touch it.

create table if not exists public.login_codes (
  id uuid primary key default gen_random_uuid (),
  email text not null check (email = lower (email)),
  code_hash text not null,
  created_at timestamptz not null default now (),
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz
);

create index if not exists login_codes_email_created_idx
  on public.login_codes (email, created_at desc);

alter table public.login_codes enable row level security;
