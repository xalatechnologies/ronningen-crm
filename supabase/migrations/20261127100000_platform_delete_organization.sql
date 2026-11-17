-- Lets the platform admin delete a whole organization, including its append-only audit trail.
--
-- audit_log blocks update/delete for the API roles and its organization FK is ON DELETE RESTRICT, so an
-- organization that ever had an audited change (even adding its first member) could not be deleted.
-- This function runs as its owner (not an API role), so the append-only trigger allows it, and it is
-- callable by service_role only (the server action behind the confirm-by-slug dialog).
-- Additive: one new function; no table, policy or existing data changes.

create or replace function public.platform_delete_organization (p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Members first: their delete is itself audited and would otherwise point at the organization being removed.
  delete from public.organization_members where organization_id = p_organization_id;
  delete from public.audit_log where organization_id = p_organization_id;
  -- Fails (and rolls everything back) if tenant data such as bookings is still there.
  delete from public.organizations where id = p_organization_id;
end;
$$;

revoke all on function public.platform_delete_organization (uuid) from public, anon, authenticated;
grant execute on function public.platform_delete_organization (uuid) to service_role;
