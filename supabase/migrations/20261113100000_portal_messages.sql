-- Customer portal, Phase 1a: one append-only message thread per booking (customer <-> venue staff).
--
-- Additive. Messages cannot be edited or deleted (audit / disputes). Read flags are set by server
-- code (service role) after authorization, never by client updates.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_messages (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  sender_kind text not null,
  sender_user_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now (),
  read_by_customer_at timestamptz,
  read_by_staff_at timestamptz,
  constraint portal_messages_sender_kind_check check (sender_kind in ('customer', 'staff')),
  constraint portal_messages_body_check check (char_length (btrim (body)) between 1 and 4000),
  constraint portal_messages_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_messages_thread_idx
  on public.portal_messages (booking_id, created_at);

alter table public.portal_messages enable row level security;

-- Customer: read the thread of their own booking, write only as themselves.
drop policy if exists "portal_messages_customer_select" on public.portal_messages;
create policy "portal_messages_customer_select"
on public.portal_messages for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_messages_customer_insert" on public.portal_messages;
create policy "portal_messages_customer_insert"
on public.portal_messages for insert to authenticated
with check (
  sender_kind = 'customer'
  and sender_user_id = auth.uid ()
  and booking_id in (select public.portal_booking_ids ())
);

-- Staff: read their organization's threads; write as staff with a booking-capable role.
drop policy if exists "portal_messages_staff_select" on public.portal_messages;
create policy "portal_messages_staff_select"
on public.portal_messages for select to authenticated
using (public.is_org_member (organization_id));

drop policy if exists "portal_messages_staff_insert" on public.portal_messages;
create policy "portal_messages_staff_insert"
on public.portal_messages for insert to authenticated
with check (
  sender_kind = 'staff'
  and sender_user_id = auth.uid ()
  and public.has_org_role (organization_id, array['owner', 'admin', 'manager'])
);

-- No update/delete policies exist; also remove the privileges so a future policy cannot open them.
revoke all on public.portal_messages from anon;
revoke update, delete on public.portal_messages from authenticated;

-- Customer e-mail throttle (one notification e-mail per booking per 15 minutes).
alter table public.portal_accounts
  add column if not exists last_customer_emailed_at timestamptz;
