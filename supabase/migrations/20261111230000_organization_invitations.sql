-- Team invitations: invite a person by e-mail, they accept via a one-time link,
-- register (or log in) and land in the organization with the invited role.
--
-- Additive only: one new table, no change to existing tables or policies.
-- The raw token is NEVER stored, only its SHA-256 hash. Accepting an invitation happens
-- server-side with the service role (the invitee has no membership yet), so RLS below only
-- lets owners/admins of the organization see and manage their own invitations.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower (email)),
  role text not null check (role in ('admin', 'manager', 'accountant', 'viewer')),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz
);

-- One open invitation per e-mail and organization.
create unique index if not exists organization_invitations_open_unique
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id, created_at desc);

alter table public.organization_invitations enable row level security;

drop policy if exists "org_owner_admin_select_invitations" on public.organization_invitations;
create policy "org_owner_admin_select_invitations"
on public.organization_invitations for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']));

-- Admins may only invite roles below themselves; owners may invite every non-owner role
-- (the table check already excludes 'owner').
drop policy if exists "org_owner_admin_insert_invitations" on public.organization_invitations;
create policy "org_owner_admin_insert_invitations"
on public.organization_invitations for insert to authenticated
with check (
  invited_by = auth.uid ()
  and (
    public.has_org_role (organization_id, array['owner'])
    or (
      public.has_org_role (organization_id, array['admin'])
      and role in ('manager', 'accountant', 'viewer')
    )
  )
);

-- Revoke / re-issue: owners and admins of the organization.
drop policy if exists "org_owner_admin_update_invitations" on public.organization_invitations;
create policy "org_owner_admin_update_invitations"
on public.organization_invitations for update to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (public.has_org_role (organization_id, array['owner', 'admin']));
