-- Customer portal, Phase 1c: the customer's day plan ("Dagens plan") and the versions they share.
--
-- Additive: two new tables. The working copy (portal_schedule_items) is private to the customer:
-- venue staff get NO policy on it. Sharing creates an immutable snapshot (portal_schedule_versions)
-- written only by server code, so the venue can never see a half-finished plan and the customer
-- cannot forge or alter a shared version.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_schedule_items (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  day_offset integer not null default 0,
  start_time time not null,
  duration_min integer,
  title text not null,
  note text,
  responsible text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint portal_schedule_items_day_check check (day_offset between 0 and 10),
  constraint portal_schedule_items_duration_check check (duration_min is null or duration_min between 5 and 1440),
  constraint portal_schedule_items_title_check check (char_length (btrim (title)) between 1 and 120),
  constraint portal_schedule_items_note_check check (note is null or char_length (note) <= 500),
  constraint portal_schedule_items_responsible_check check (responsible is null or char_length (responsible) <= 80),
  constraint portal_schedule_items_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_schedule_items_booking_idx
  on public.portal_schedule_items (booking_id, day_offset, start_time);

create table if not exists public.portal_schedule_versions (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  version integer not null,
  items jsonb not null,
  content_hash text not null,
  shared_by uuid references auth.users (id) on delete set null,
  shared_at timestamptz not null default now (),
  acknowledged_by uuid references auth.users (id) on delete set null,
  acknowledged_at timestamptz,
  staff_note text,
  constraint portal_schedule_versions_note_check check (staff_note is null or char_length (staff_note) <= 1000),
  constraint portal_schedule_versions_unique unique (booking_id, version),
  constraint portal_schedule_versions_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

alter table public.portal_schedule_items enable row level security;
alter table public.portal_schedule_versions enable row level security;

-- Working copy: the customer (and only the customer) manages it. No staff policy on purpose.
drop policy if exists "portal_schedule_items_customer_select" on public.portal_schedule_items;
create policy "portal_schedule_items_customer_select"
on public.portal_schedule_items for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_schedule_items_customer_insert" on public.portal_schedule_items;
create policy "portal_schedule_items_customer_insert"
on public.portal_schedule_items for insert to authenticated
with check (created_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_schedule_items_customer_update" on public.portal_schedule_items;
create policy "portal_schedule_items_customer_update"
on public.portal_schedule_items for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_schedule_items_customer_delete" on public.portal_schedule_items;
create policy "portal_schedule_items_customer_delete"
on public.portal_schedule_items for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

-- Shared versions: both sides read; nobody writes from the client.
drop policy if exists "portal_schedule_versions_customer_select" on public.portal_schedule_versions;
create policy "portal_schedule_versions_customer_select"
on public.portal_schedule_versions for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_schedule_versions_staff_select" on public.portal_schedule_versions;
create policy "portal_schedule_versions_staff_select"
on public.portal_schedule_versions for select to authenticated
using (public.is_org_member (organization_id));

revoke all on public.portal_schedule_items, public.portal_schedule_versions from anon;
revoke insert, update, delete on public.portal_schedule_versions from authenticated;
