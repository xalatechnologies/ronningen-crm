-- Customer portal, Phase 0: accounts for customers (arrangers) that live OUTSIDE organization_members.
--
-- Additive. Nothing existing is dropped or rewritten except ONE function body (section 1), which
-- only changes behaviour for an invalid state (an org the caller is not a member of).
-- Customers never get an organization_members row, so every existing is_org_member() policy stays
-- closed to them.
--
-- NOT APPLIED automatically. Review, then apply deliberately (staging first).

-- 1. Hardening: current_organization_id() trusted profiles.active_organization_id even when the
--    caller is not a member of that organization (profiles are self-updatable). Only the support
--    ticket insert policy uses it today; once customers exist, the value must be provably theirs.
create or replace function public.current_organization_id ()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce (
    (
      select p.active_organization_id
      from public.profiles p
      where p.id = auth.uid ()
        and (
          exists (
            select 1
            from public.organization_members om
            where om.organization_id = p.active_organization_id
              and om.user_id = auth.uid ()
          )
          or public.is_impersonating_org (p.active_organization_id)
        )
    ),
    (select om.organization_id from public.organization_members om where om.user_id = auth.uid () limit 1)
  );
$$;

-- 2. Per-organization switches (default OFF: no behaviour change until a venue turns it on).
alter table public.organizations
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists portal_auto_invite boolean not null default true;

-- 3. portal_accounts: one row per invited customer per booking.
create table if not exists public.portal_accounts (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  customer_id uuid not null references public.customers (id) on delete restrict,
  email text not null,
  role text not null default 'host',
  user_id uuid references auth.users (id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now (),
  constraint portal_accounts_role_check check (role in ('host')),
  constraint portal_accounts_email_lower check (email = lower (email)),
  constraint portal_accounts_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict,
  constraint portal_accounts_org_id_key unique (organization_id, id)
);

-- One live account per booking and e-mail (re-inviting replaces the token, never duplicates).
create unique index if not exists portal_accounts_one_live
  on public.portal_accounts (booking_id, email)
  where revoked_at is null;

create index if not exists portal_accounts_user_idx
  on public.portal_accounts (user_id)
  where user_id is not null and revoked_at is null;

-- 4. Helper for portal RLS in later phases: the bookings the signed-in customer may see.
create or replace function public.portal_booking_ids ()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select pa.booking_id
  from public.portal_accounts pa
  where pa.user_id = auth.uid ()
    and pa.revoked_at is null
    and pa.accepted_at is not null;
$$;

revoke all on function public.portal_booking_ids () from public;
revoke execute on function public.portal_booking_ids () from anon;
grant execute on function public.portal_booking_ids () to authenticated;

-- 5. RLS. Customers read their own account row; venue staff read their organization's rows.
--    There are NO insert/update/delete policies: all writes go through server code (service role)
--    after an explicit authorization check, like organization_invitations.
alter table public.portal_accounts enable row level security;

drop policy if exists "portal_accounts_select_own" on public.portal_accounts;
create policy "portal_accounts_select_own"
on public.portal_accounts for select to authenticated
using (user_id = auth.uid ());

drop policy if exists "portal_accounts_select_staff" on public.portal_accounts;
create policy "portal_accounts_select_staff"
on public.portal_accounts for select to authenticated
using (public.is_org_member (organization_id));

-- The token hash never leaves the database for client roles.
revoke select on public.portal_accounts from authenticated, anon;
grant select (
  id, organization_id, booking_id, customer_id, email, role, user_id,
  expires_at, invited_by, accepted_at, revoked_at, created_at
) on public.portal_accounts to authenticated;
