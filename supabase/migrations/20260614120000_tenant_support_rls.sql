-- Tenant-facing support: columns + org-member RLS policies.

alter table public.platform_support_tickets
add column if not exists created_by_user_id uuid references auth.users (id) on delete set null;

alter table public.platform_support_tickets
add column if not exists category text not null default 'other'
  check (category in ('bug', 'billing', 'access', 'feature', 'other'));

alter table public.platform_support_notes
add column if not exists is_internal boolean not null default false;

create policy "org_members_select_support_tickets"
on public.platform_support_tickets for select to authenticated
using (public.is_org_member (organization_id));

create policy "org_members_insert_support_tickets"
on public.platform_support_tickets for insert to authenticated
with check (
  public.is_org_member (organization_id)
  and organization_id = public.current_organization_id ()
);

create policy "org_members_select_public_notes"
on public.platform_support_notes for select to authenticated
using (
  is_internal = false
  and exists (
    select 1
    from public.platform_support_tickets t
    where t.id = ticket_id
      and public.is_org_member (t.organization_id)
  )
);

create policy "org_members_insert_public_notes"
on public.platform_support_notes for insert to authenticated
with check (
  is_internal = false
  and author_user_id = auth.uid ()
  and exists (
    select 1
    from public.platform_support_tickets t
    where t.id = ticket_id
      and public.is_org_member (t.organization_id)
  )
);
