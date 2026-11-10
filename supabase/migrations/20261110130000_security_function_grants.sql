-- Security hardening: function EXECUTE grants. Revoke-only, no data touched, safe to re-run.
--
-- Supabase's default privileges grant EXECUTE on new public functions directly to anon and
-- authenticated, so "revoke ... from public" in earlier migrations did not remove them.
-- Matching by name (all overloads) so this works regardless of exact signatures.
--
-- Called only through the service-role admin client (src/lib/contracts/guest.ts,
-- src/app/api/cron/contract-jobs, src/lib/admin/queries/users-billing-audit.ts):
-- no anon / authenticated access.
-- Called from signed-in user clients (src/lib/contracts/actions.ts, team settings):
-- authenticated stays, anon goes.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'contract_lookup_invite', 'contract_open_session', 'contract_record_view',
        'contract_store_otp', 'contract_confirm_otp', 'contract_accept',
        'contract_expire_outstanding', 'audit_action_counts', 'audit_unique_actors_since'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;

  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'contract_create_draft', 'contract_update_draft', 'contract_send_version',
        'contract_withdraw_offer', 'contract_append_event',
        'assert_authenticated_contract_writer', 'find_user_id_by_email'
      )
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end
$$;
