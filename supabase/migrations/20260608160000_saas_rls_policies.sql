-- SaaS: org-scoped RLS policies (replaces global single-tenant policies).

-- Drop legacy policies
drop policy if exists "read_properties_authenticated" on public.properties;
drop policy if exists "read_customers_authenticated" on public.customers;
drop policy if exists "read_bookings_authenticated" on public.bookings;
drop policy if exists "read_packages_authenticated" on public.packages;
drop policy if exists "read_services_authenticated" on public.services;
drop policy if exists "read_transactions_authenticated" on public.transactions;
drop policy if exists "read_assets_authenticated" on public.assets;
drop policy if exists "read_partners_authenticated" on public.partners;
drop policy if exists "read_booking_inquiries_authenticated" on public.booking_inquiries;
drop policy if exists "read_booking_inquiry_activities_authenticated" on public.booking_inquiry_activities;
drop policy if exists "read_accommodation_units_authenticated" on public.accommodation_units;
drop policy if exists "read_accommodation_reservations_authenticated" on public.accommodation_reservations;

drop policy if exists "owner_admin_modify_properties" on public.properties;
drop policy if exists "owner_admin_modify_customers" on public.customers;
drop policy if exists "owner_admin_modify_bookings" on public.bookings;
drop policy if exists "owner_admin_modify_packages" on public.packages;
drop policy if exists "owner_admin_modify_services" on public.services;
drop policy if exists "owner_admin_modify_transactions" on public.transactions;
drop policy if exists "owner_admin_modify_assets" on public.assets;
drop policy if exists "owner_admin_modify_partners" on public.partners;
drop policy if exists "owner_admin_modify_booking_inquiries" on public.booking_inquiries;
drop policy if exists "owner_admin_modify_booking_inquiry_activities" on public.booking_inquiry_activities;
drop policy if exists "owner_admin_modify_accommodation_units" on public.accommodation_units;
drop policy if exists "owner_admin_modify_accommodation_reservations" on public.accommodation_reservations;

drop policy if exists "accountant_modify_transactions" on public.transactions;
drop policy if exists "accountant_modify_packages" on public.packages;
drop policy if exists "accountant_modify_services" on public.services;

-- organizations
create policy "org_members_select_organizations"
on public.organizations for select to authenticated
using (public.is_org_member (id));

create policy "org_onboarding_select_organizations"
on public.organizations for select to authenticated
using (
  not exists (
    select 1
    from public.organization_members om
    where om.organization_id = organizations.id
  )
);

create policy "authenticated_insert_organizations"
on public.organizations for insert to authenticated
with check (true);

create policy "org_owner_admin_update_organizations"
on public.organizations for update to authenticated
using (public.has_org_role (id, array['owner', 'admin']))
with check (public.has_org_role (id, array['owner', 'admin']));

create policy "org_owner_delete_organizations"
on public.organizations for delete to authenticated
using (public.has_org_role (id, array['owner']));

-- organization_members
create policy "org_members_select_organization_members"
on public.organization_members for select to authenticated
using (public.is_org_member (organization_id));

create policy "org_owner_admin_manage_organization_members"
on public.organization_members for insert to authenticated
with check (
  public.has_org_role (organization_id, array['owner', 'admin'])
  or (
    user_id = auth.uid ()
    and role = 'owner'
    and not exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_id
    )
  )
);

create policy "org_owner_admin_update_organization_members"
on public.organization_members for update to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (public.has_org_role (organization_id, array['owner', 'admin']));

create policy "org_owner_admin_delete_organization_members"
on public.organization_members for delete to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']));

-- subscriptions
create policy "org_owner_admin_select_subscriptions"
on public.subscriptions for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']));

create policy "org_owner_manage_subscriptions"
on public.subscriptions for insert to authenticated
with check (public.has_org_role (organization_id, array['owner']));

create policy "org_owner_update_subscriptions"
on public.subscriptions for update to authenticated
using (public.has_org_role (organization_id, array['owner']))
with check (public.has_org_role (organization_id, array['owner']));

create policy "org_owner_delete_subscriptions"
on public.subscriptions for delete to authenticated
using (public.has_org_role (organization_id, array['owner']));

-- Tenant tables: SELECT for org members
create policy "org_select_properties"
on public.properties for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_customers"
on public.customers for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_partners"
on public.partners for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_bookings"
on public.bookings for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_packages"
on public.packages for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_services"
on public.services for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_transactions"
on public.transactions for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_assets"
on public.assets for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_booking_inquiries"
on public.booking_inquiries for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_accommodation_units"
on public.accommodation_units for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_accommodation_reservations"
on public.accommodation_reservations for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

-- booking_inquiry_activities: indirect scope via parent inquiry
create policy "org_select_booking_inquiry_activities"
on public.booking_inquiry_activities for select to authenticated
using (
  exists (
    select 1
    from public.booking_inquiries bi
    where bi.id = booking_inquiry_activities.inquiry_id
      and bi.organization_id in (select public.user_organization_ids ())
  )
);

-- Owner/admin full write on tenant tables
create policy "org_owner_admin_write_properties"
on public.properties for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_customers"
on public.customers for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_partners"
on public.partners for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_bookings"
on public.bookings for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_packages"
on public.packages for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_services"
on public.services for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_transactions"
on public.transactions for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_assets"
on public.assets for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_booking_inquiries"
on public.booking_inquiries for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_accommodation_units"
on public.accommodation_units for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

create policy "org_owner_admin_write_accommodation_reservations"
on public.accommodation_reservations for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['owner', 'admin'])
);

-- Manager write on operational tables
create policy "org_manager_write_bookings"
on public.bookings for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_customers"
on public.customers for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_properties"
on public.properties for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_partners"
on public.partners for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_booking_inquiries"
on public.booking_inquiries for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_accommodation_units"
on public.accommodation_units for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_accommodation_reservations"
on public.accommodation_reservations for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_packages"
on public.packages for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_services"
on public.services for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

create policy "org_manager_write_assets"
on public.assets for all to authenticated
using (public.has_org_role (organization_id, array['manager']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['manager'])
);

-- Accountant write on finance tables
create policy "org_accountant_write_transactions"
on public.transactions for all to authenticated
using (public.has_org_role (organization_id, array['accountant']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['accountant'])
);

create policy "org_accountant_write_packages"
on public.packages for all to authenticated
using (public.has_org_role (organization_id, array['accountant']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['accountant'])
);

create policy "org_accountant_write_services"
on public.services for all to authenticated
using (public.has_org_role (organization_id, array['accountant']))
with check (
  organization_id is not null
  and public.is_org_member (organization_id)
  and public.has_org_role (organization_id, array['accountant'])
);

-- booking_inquiry_activities: manager/owner/admin via parent org
create policy "org_write_booking_inquiry_activities"
on public.booking_inquiry_activities for all to authenticated
using (
  exists (
    select 1
    from public.booking_inquiries bi
    where bi.id = booking_inquiry_activities.inquiry_id
      and public.has_org_role (bi.organization_id, array['owner', 'admin', 'manager'])
  )
)
with check (
  exists (
    select 1
    from public.booking_inquiries bi
    where bi.id = booking_inquiry_activities.inquiry_id
      and public.has_org_role (bi.organization_id, array['owner', 'admin', 'manager'])
  )
);
