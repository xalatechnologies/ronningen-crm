-- Security hardening, part 3. Additive column + policy replacements; no rows changed or deleted.
--
-- Onboarding (src/lib/organizations/organization-queries.ts createOrganizationForUser) does, as the
-- signed-in user: insert organization + read it back, insert self as owner, insert subscription.
--
-- 1. Anyone could create organizations with no ownership trace, and every authenticated user could
--    read ALL member-less organizations. Record the creator and only let the creator see/create.
-- 2. A plain member could insert a subscription (self-grant a plan) when none existed. Owner only.
-- 3. owner_admin_modify_profiles let any profile with role owner/admin write ANY profile in ANY
--    tenant. Scope it to profiles the caller shares an organization with.

alter table public.organizations
  add column if not exists created_by uuid default auth.uid ();

drop policy if exists "authenticated_insert_organizations" on public.organizations;
create policy "authenticated_insert_organizations"
on public.organizations for insert to authenticated
with check (created_by = auth.uid ());

drop policy if exists "org_onboarding_select_organizations" on public.organizations;
create policy "org_onboarding_select_organizations"
on public.organizations for select to authenticated
using (
  created_by = auth.uid ()
  and public.organization_has_no_members (id)
);

drop policy if exists "org_owner_manage_subscriptions" on public.subscriptions;
create policy "org_owner_manage_subscriptions"
on public.subscriptions for insert to authenticated
with check (public.has_org_role (organization_id, array['owner']));

drop policy if exists "owner_admin_modify_profiles" on public.profiles;
create policy "owner_admin_modify_profiles"
on public.profiles for all to authenticated
using (
  public.current_profile_role () in ('owner', 'admin')
  and public.can_read_profile (id)
)
with check (
  public.current_profile_role () in ('owner', 'admin')
  and public.can_read_profile (id)
);
