-- One-time tenant onboarding (org profile + lokaler), not re-prompted on every login.

alter table public.organizations
add column if not exists tenant_setup_completed_at timestamptz;

comment on column public.organizations.tenant_setup_completed_at is
  'Set when owner/admin finishes or skips first-time setup. Null only for brand-new orgs.';

-- Existing organizations should not be forced through setup again.
update public.organizations
set tenant_setup_completed_at = coalesce(updated_at, created_at, now())
where tenant_setup_completed_at is null;
