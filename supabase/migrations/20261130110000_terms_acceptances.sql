-- Proof of which agreements a user accepted at signup (terms of use, privacy policy, data processing agreement),
-- at which version and when. Written by the server (service role) only; a user can read their own rows.
--
-- Additive: one new table. NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null,
  version text not null,
  accepted_at timestamptz not null default now (),
  constraint terms_acceptances_document_check check (document in ('terms', 'privacy', 'dpa')),
  constraint terms_acceptances_version_check check (char_length (version) between 1 and 40),
  constraint terms_acceptances_unique unique (user_id, document, version)
);

create index if not exists terms_acceptances_user_idx on public.terms_acceptances (user_id);

alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from anon, authenticated;
grant select on public.terms_acceptances to authenticated;

drop policy if exists "terms_acceptances_select_own" on public.terms_acceptances;
create policy "terms_acceptances_select_own"
on public.terms_acceptances for select to authenticated
using (user_id = auth.uid ());
