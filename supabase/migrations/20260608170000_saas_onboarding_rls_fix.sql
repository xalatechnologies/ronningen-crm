-- Fix onboarding: INSERT ... RETURNING on organizations fails SELECT RLS before
-- organization_members row exists. Allow SELECT on memberless orgs during bootstrap.

create policy "org_onboarding_select_organizations"
on public.organizations for select to authenticated
using (
  not exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
  )
);

-- Subscription insert during onboarding happens before owner membership is visible
-- to has_org_role in the same request window; allow first subscription bootstrap.
drop policy if exists "org_owner_manage_subscriptions" on public.subscriptions;

create policy "org_owner_manage_subscriptions"
on public.subscriptions for insert to authenticated
with check (
  public.has_org_role (organization_id, array['owner'])
  or (
    public.is_org_member (organization_id)
    and not exists (
      select 1
      from public.subscriptions s
      where s.organization_id = subscriptions.organization_id
    )
  )
);
