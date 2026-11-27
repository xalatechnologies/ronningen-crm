-- DRAFT. Do not apply to production before the checklist at the bottom is done.
--
-- Problem
--   The policy "org_owner_admin_update_organizations" lets an organization owner or admin UPDATE the row of
--   their own organization. It has no column restriction, so from the browser (the anon key and the user's
--   session are public) they can also change billing and suspension columns, for example billing_exempt,
--   subscription_status, subscription_plan, trial_ends_at, is_suspended, billing_email.
--
-- Fix
--   Column-level privileges: signed-in users may update only the columns the app lets them edit. Everything
--   else (billing, suspension, admin notes, slug, activity) can only be written by the service role, which
--   bypasses these grants (server actions that use the admin client, webhooks, the platform admin).
--
-- Columns kept writable for `authenticated` (all verified against the code that updates the table with the
-- signed-in user's rights):
--   profile (updateOrganizationProfile):   name, legal_name, tagline, org_number, address_line1, address_line2,
--                                         postal_code, city, contact_email, contact_phone, logo_url,
--                                         bank_account, payment_instructions
--   setup (completeTenantSetup):          tenant_setup_completed_at
--   contracts (setContractsPilotSettings): contracts_enabled, legal_terms_approved_at
--   portal (setPortalSettings):   portal_enabled, portal_auto_invite, portal_guest_invites_enabled
--
-- Triggers (for example updated_at) are not affected: column privileges apply to the columns in the UPDATE's
-- SET list, not to changes a trigger makes.

revoke update on table public.organizations from authenticated;

grant update (
  name,
  legal_name,
  tagline,
  org_number,
  address_line1,
  address_line2,
  postal_code,
  city,
  contact_email,
  contact_phone,
  logo_url,
  bank_account,
  payment_instructions,
  tenant_setup_completed_at,
  contracts_enabled,
  legal_terms_approved_at,
  portal_enabled,
  portal_auto_invite,
  portal_guest_invites_enabled
) on table public.organizations to authenticated;

-- Rollback (restores the previous, too wide, privileges):
--   grant update on table public.organizations to authenticated;
--
-- Checklist before applying to production
--   1. Restore a copy of the production database and apply this migration there first.
--   2. Run the app against that copy and exercise every settings page that saves: Organisasjon, Lokaler,
--      Leieavtaler (contracts and customer portal switches), the onboarding setup steps, billing.
--   3. Run `npm run test:e2e` against the copy.
--   4. Confirm that, as an owner, this fails with "permission denied for table organizations":
--        update public.organizations set billing_exempt = true where id = '<own organization id>';
--      and that saving the Organisasjon page still works.
--   5. Check other writes with the user's rights that this review could not see (for example generic helpers
--      that build the table name at run time).
--
-- Related, not covered here: INSERT on organizations (policy "authenticated_insert_organizations" checks only
-- created_by) and INSERT on subscriptions ("org_owner_manage_subscriptions") also accept any column values
-- from the creator. They deserve the same review.
