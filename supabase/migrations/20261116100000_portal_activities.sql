-- Customer portal, Phase 2d: activities guests can accept or decline (Spond-style).
--
-- Additive: two new tables and one server-only function.
--
-- PRIVACY: activities and answers belong to the customer; venue staff get NO policy on either
-- table (anything the venue must know goes in the shared day plan). Guests never touch the tables:
-- they answer through portal_activity_answer(), callable only by the service role from server code
-- that has already validated the guest's secret link.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_activities (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience text not null default 'all',
  capacity integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint portal_activities_title_check check (char_length (btrim (title)) between 1 and 80),
  constraint portal_activities_description_check check (char_length (description) <= 500),
  constraint portal_activities_location_check check (char_length (location) <= 100),
  constraint portal_activities_audience_check check (audience in ('all', 'selected')),
  constraint portal_activities_capacity_check check (capacity is null or capacity between 1 and 500),
  constraint portal_activities_end_check check (ends_at is null or ends_at > starts_at),
  constraint portal_activities_no_links check ((title || ' ' || description || ' ' || location) !~* '(https?://|www\.)'),
  constraint portal_activities_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_activities_booking_idx on public.portal_activities (booking_id, starts_at);

-- One row per (activity, guest): either "this guest is invited" (audience = selected, response null)
-- or the guest's answer (any audience). Response columns are written by server code only.
create table if not exists public.portal_activity_invitees (
  activity_id uuid not null references public.portal_activities (id) on delete cascade,
  guest_id uuid not null references public.portal_guests (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  response text,
  people integer,
  responded_at timestamptz,
  primary key (activity_id, guest_id),
  constraint portal_activity_invitees_response_check check (response is null or response in ('yes', 'no', 'maybe')),
  constraint portal_activity_invitees_people_check check (people is null or people between 1 and 10),
  constraint portal_activity_invitees_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_activity_invitees_guest_idx on public.portal_activity_invitees (guest_id);

alter table public.portal_activities enable row level security;
alter table public.portal_activity_invitees enable row level security;

drop policy if exists "portal_activities_customer_select" on public.portal_activities;
create policy "portal_activities_customer_select"
on public.portal_activities for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_activities_customer_insert" on public.portal_activities;
create policy "portal_activities_customer_insert"
on public.portal_activities for insert to authenticated
with check (created_by = auth.uid () and booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_activities_customer_update" on public.portal_activities;
create policy "portal_activities_customer_update"
on public.portal_activities for update to authenticated
using (booking_id in (select public.portal_booking_ids ()))
with check (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_activities_customer_delete" on public.portal_activities;
create policy "portal_activities_customer_delete"
on public.portal_activities for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

-- Invitees: the customer reads everything (names + answers) and chooses WHO is invited; they cannot write answers.
drop policy if exists "portal_activity_invitees_customer_select" on public.portal_activity_invitees;
create policy "portal_activity_invitees_customer_select"
on public.portal_activity_invitees for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

drop policy if exists "portal_activity_invitees_customer_insert" on public.portal_activity_invitees;
create policy "portal_activity_invitees_customer_insert"
on public.portal_activity_invitees for insert to authenticated
with check (
  booking_id in (select public.portal_booking_ids ())
  and exists (select 1 from public.portal_activities a where a.id = activity_id and a.booking_id = portal_activity_invitees.booking_id)
  and exists (select 1 from public.portal_guests g where g.id = guest_id and g.booking_id = portal_activity_invitees.booking_id)
);

drop policy if exists "portal_activity_invitees_customer_delete" on public.portal_activity_invitees;
create policy "portal_activity_invitees_customer_delete"
on public.portal_activity_invitees for delete to authenticated
using (booking_id in (select public.portal_booking_ids ()));

revoke all on public.portal_activities, public.portal_activity_invitees from anon, authenticated;
grant select on public.portal_activities to authenticated;
grant insert (organization_id, booking_id, title, description, location, starts_at, ends_at, audience, capacity, created_by)
  on public.portal_activities to authenticated;
grant update (title, description, location, starts_at, ends_at, audience, capacity, updated_at)
  on public.portal_activities to authenticated;
grant delete on public.portal_activities to authenticated;
grant select on public.portal_activity_invitees to authenticated;
grant insert (activity_id, guest_id, organization_id, booking_id) on public.portal_activity_invitees to authenticated;
grant delete on public.portal_activity_invitees to authenticated;

-- A guest's answer, atomically: validates that the guest belongs to the activity's booking, is invited
-- (audience all, or an invitee row), that the activity has not started, and that capacity is not exceeded
-- (counting people, with the activity row locked so two answers cannot both take the last place).
-- Returns 'ok' | 'not_found' | 'not_invited' | 'closed' | 'full'.
create or replace function public.portal_activity_answer (
  p_guest_id uuid,
  p_activity_id uuid,
  p_response text,
  p_people integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act public.portal_activities%rowtype;
  v_guest public.portal_guests%rowtype;
  v_taken integer;
  v_mine integer;
begin
  if p_response not in ('yes', 'no', 'maybe') then
    return 'not_found';
  end if;

  select * into v_act from public.portal_activities where id = p_activity_id for update;
  select * into v_guest from public.portal_guests where id = p_guest_id;
  if v_act.id is null or v_guest.id is null or v_act.booking_id <> v_guest.booking_id then
    return 'not_found';
  end if;

  if v_act.audience = 'selected'
     and not exists (select 1 from public.portal_activity_invitees i where i.activity_id = v_act.id and i.guest_id = v_guest.id) then
    return 'not_invited';
  end if;

  if coalesce (v_act.ends_at, v_act.starts_at) <= now () then
    return 'closed';
  end if;

  v_mine := least (greatest (coalesce (p_people, 1), 1), greatest (v_guest.party_size, 1));

  if p_response = 'yes' and v_act.capacity is not null then
    select coalesce (sum (people), 0) into v_taken
    from public.portal_activity_invitees
    where activity_id = v_act.id and response = 'yes' and guest_id <> v_guest.id;
    if v_taken + v_mine > v_act.capacity then
      return 'full';
    end if;
  end if;

  insert into public.portal_activity_invitees (activity_id, guest_id, organization_id, booking_id, response, people, responded_at)
  values (v_act.id, v_guest.id, v_act.organization_id, v_act.booking_id, p_response, case when p_response = 'yes' then v_mine else null end, now ())
  on conflict (activity_id, guest_id)
  do update set response = excluded.response, people = excluded.people, responded_at = excluded.responded_at;

  return 'ok';
end;
$$;

revoke all on function public.portal_activity_answer (uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.portal_activity_answer (uuid, uuid, text, integer) to service_role;
