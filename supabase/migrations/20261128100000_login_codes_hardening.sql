-- Hardens the one-time e-mail login codes. Additive: two new functions and one new table; login_codes is unchanged.
--
-- 1. login_code_register_attempt: counts an attempt BEFORE the code is compared, in one atomic UPDATE.
--    Reading attempts, comparing, then writing attempts+1 lets parallel guesses all read "0" and bypass the limit.
-- 2. login_code_ip_hits + login_code_ip_allow: a per-IP limit (only a hash of the IP is stored), because the
--    existing limit is per e-mail and a single address can try many e-mails.
-- Everything is server-side only: RLS on, no policies, execute granted to service_role.

create or replace function public.login_code_register_attempt (p_id uuid, p_max int)
returns int
language sql
security definer
set search_path = public
as $$
  update public.login_codes
  set attempts = attempts + 1
  where id = p_id
    and used_at is null
    and expires_at > now ()
    and attempts < p_max
  returning attempts;
$$;

create table if not exists public.login_code_ip_hits (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  kind text not null check (kind in ('request', 'verify')),
  created_at timestamptz not null default now ()
);

create index if not exists login_code_ip_hits_lookup_idx
  on public.login_code_ip_hits (ip_hash, kind, created_at desc);

alter table public.login_code_ip_hits enable row level security;

-- Records one hit and tells whether the caller is still within the limit.
create or replace function public.login_code_ip_allow (p_ip_hash text, p_kind text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Housekeeping: nothing older than a day is ever needed.
  delete from public.login_code_ip_hits where created_at < now () - interval '1 day';
  insert into public.login_code_ip_hits (ip_hash, kind) values (p_ip_hash, p_kind);
  select count(*) into v_count
  from public.login_code_ip_hits
  where ip_hash = p_ip_hash
    and kind = p_kind
    and created_at > now () - make_interval (secs => p_window_seconds);
  return v_count <= p_max;
end;
$$;

revoke all on function public.login_code_register_attempt (uuid, int) from public, anon, authenticated;
revoke all on function public.login_code_ip_allow (text, text, int, int) from public, anon, authenticated;
grant execute on function public.login_code_register_attempt (uuid, int) to service_role;
grant execute on function public.login_code_ip_allow (text, text, int, int) to service_role;
