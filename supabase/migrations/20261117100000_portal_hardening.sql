-- Customer portal hardening (from the security and correctness review). Additive, idempotent.
--
-- 1. Access cut-off: portal_booking_ids() also requires the venue's portal_enabled switch, so turning
--    the portal off ends every customer's access at the database level.
-- 2. Staff read access narrowed to owner/admin/manager (was any member incl. viewer/accountant), and
--    unsent DRAFT wishes are no longer readable by staff.
-- 3. Customers cannot bypass the app's limits by writing through the API: message columns restricted,
--    rate limit and volume caps enforced by triggers, a published invitation must have a headline + date.
-- 4. A guest's e-mail change revokes their links and resets their answers inside the database.
-- 5. portal_wish_items.quote_seq: every quote change bumps it, so an approval can only apply to the
--    quote the customer actually saw.
-- 6. portal_claim_guest_sends(): atomic "claim then send" for guest e-mails (advisory lock + daily cap).
--
-- NOT APPLIED automatically. Review, then apply deliberately.

-- 1. Access cut-off ---------------------------------------------------------------------------------
create or replace function public.portal_booking_ids ()
returns setof uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select pa.booking_id
  from public.portal_accounts pa
  join public.organizations o on o.id = pa.organization_id
  where pa.user_id = auth.uid ()
    and pa.revoked_at is null
    and pa.accepted_at is not null
    and o.portal_enabled;
$$;

-- 2. Staff reads: owner/admin/manager only ------------------------------------------------------------
drop policy if exists "portal_accounts_select_staff" on public.portal_accounts;
create policy "portal_accounts_select_staff"
on public.portal_accounts for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

drop policy if exists "portal_messages_staff_select" on public.portal_messages;
create policy "portal_messages_staff_select"
on public.portal_messages for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

drop policy if exists "portal_wish_items_staff_select" on public.portal_wish_items;
create policy "portal_wish_items_staff_select"
on public.portal_wish_items for select to authenticated
using (status <> 'draft' and public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

drop policy if exists "portal_wish_quotes_staff_select" on public.portal_wish_quotes;
create policy "portal_wish_quotes_staff_select"
on public.portal_wish_quotes for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

drop policy if exists "portal_wish_counters_staff_select" on public.portal_wish_counters;
create policy "portal_wish_counters_staff_select"
on public.portal_wish_counters for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

drop policy if exists "portal_schedule_versions_staff_select" on public.portal_schedule_versions;
create policy "portal_schedule_versions_staff_select"
on public.portal_schedule_versions for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create or replace function public.portal_guest_summary (p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_org uuid;
  v_counts jsonb;
  v_diet jsonb;
  v_comments integer;
begin
  select organization_id into v_org from public.bookings where id = p_booking_id;
  if v_org is null or not public.has_org_role (v_org, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object (
    'total', count (*),
    'not_sent', count (*) filter (where status = 'not_sent'),
    'invited', count (*) filter (where status <> 'not_sent'),
    'no_answer', count (*) filter (where status = 'invited'),
    'accepted_guests', count (*) filter (where status = 'accepted'),
    'accepted_people', coalesce (sum (party_size) filter (where status = 'accepted'), 0),
    'declined', count (*) filter (where status = 'declined'),
    'maybe', count (*) filter (where status = 'maybe')
  )
  into v_counts
  from public.portal_guests
  where booking_id = p_booking_id;

  select coalesce (jsonb_object_agg (t.tag, t.n), '{}'::jsonb)
  into v_diet
  from (
    select tag, count (*) as n
    from public.portal_guests g,
      jsonb_array_elements (g.diet) as p,
      jsonb_array_elements_text (coalesce (p -> 'tags', '[]'::jsonb)) as tag
    where g.booking_id = p_booking_id and g.status = 'accepted'
    group by tag
  ) t;

  select count (*)
  into v_comments
  from public.portal_guests g, jsonb_array_elements (g.diet) as p
  where g.booking_id = p_booking_id
    and g.status = 'accepted'
    and btrim (coalesce (p ->> 'note', '')) <> '';

  return v_counts || jsonb_build_object ('diet', v_diet, 'comments', v_comments);
end;
$$;

-- 3. Direct-API limits ------------------------------------------------------------------------------
-- Messages: customers and staff may only set these columns; created_at / read flags are server-owned.
revoke insert on public.portal_messages from authenticated;
grant insert (organization_id, booking_id, sender_kind, sender_user_id, body) on public.portal_messages to authenticated;

create or replace function public.portal_messages_rate_limit ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count (*) from public.portal_messages m
    where m.booking_id = new.booking_id
      and m.sender_user_id is not distinct from new.sender_user_id
      and m.created_at > now () - interval '1 minute'
  ) >= 10 then
    raise exception 'too many messages, wait a moment' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_messages_rate_limit on public.portal_messages;
create trigger portal_messages_rate_limit
before insert on public.portal_messages
for each row execute function public.portal_messages_rate_limit ();

-- Volume caps per booking (TG_ARGV[0] = limit).
create or replace function public.portal_enforce_cap ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  execute format ('select count (*) from public.%I where booking_id = $1', tg_table_name) into v_count using new.booking_id;
  if v_count >= tg_argv[0]::bigint then
    raise exception 'limit of % rows per booking reached for %', tg_argv[0], tg_table_name using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_schedule_items_cap on public.portal_schedule_items;
create trigger portal_schedule_items_cap before insert on public.portal_schedule_items
for each row execute function public.portal_enforce_cap ('100');

drop trigger if exists portal_wish_items_cap on public.portal_wish_items;
create trigger portal_wish_items_cap before insert on public.portal_wish_items
for each row execute function public.portal_enforce_cap ('200');

drop trigger if exists portal_activities_cap on public.portal_activities;
create trigger portal_activities_cap before insert on public.portal_activities
for each row execute function public.portal_enforce_cap ('100');

-- A published invitation needs a headline and a date (also when written directly through the API).
alter table public.portal_invite_designs drop constraint if exists portal_invite_designs_publish_check;
alter table public.portal_invite_designs
  add constraint portal_invite_designs_publish_check
  check (status <> 'published' or (btrim (headline) <> '' and btrim (event_date_text) <> ''));

-- 4. E-mail change = new person: revoke links, clear answers (even for direct API edits) ----------------
create or replace function public.portal_guests_email_change ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and old.status <> 'not_sent' then
    delete from public.portal_guest_tokens where guest_id = old.id;
    delete from public.portal_activity_invitees i
      using public.portal_activities a
      where i.guest_id = old.id and i.activity_id = a.id and a.audience = 'all';
    update public.portal_activity_invitees
      set response = null, people = null, responded_at = null
      where guest_id = old.id;
    new.status := 'not_sent';
    new.party_size := 1;
    new.diet := '[]'::jsonb;
    new.diet_consent_at := null;
    new.responded_at := null;
    new.last_sent_at := null;
    new.send_count := 0;
    new.rsvp_count := 0;
    new.last_rsvp_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists portal_guests_email_change on public.portal_guests;
create trigger portal_guests_email_change
before update of email on public.portal_guests
for each row execute function public.portal_guests_email_change ();

-- 5. Quote version -------------------------------------------------------------------------------
alter table public.portal_wish_items add column if not exists quote_seq integer not null default 0;

-- 6. Atomic claim for guest e-mails -----------------------------------------------------------------
-- (per booking, per organization and platform-wide daily caps, all checked under one lock)
alter table public.portal_guest_emails drop constraint if exists portal_guest_emails_status_check;
alter table public.portal_guest_emails
  add constraint portal_guest_emails_status_check check (status in ('pending', 'sent', 'skipped', 'failed'));

-- Re-checks eligibility inside the database under a per-booking lock, counts today's e-mails (pending
-- included) against the cap and inserts a 'pending' row per claimed guest. Two overlapping sends can never
-- claim the same guest or exceed the cap. Returns the claimed (email row, guest) pairs.
create or replace function public.portal_claim_guest_sends (
  p_booking_id uuid,
  p_kind text,
  p_cap integer,
  p_org_cap integer,
  p_platform_cap integer
)
returns table (claim_email_id uuid, claim_guest_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_used integer;
  v_org_used integer;
  v_platform_used integer;
  v_room integer;
begin
  select organization_id into v_org from public.bookings where id = p_booking_id;
  if v_org is null or p_kind not in ('invite', 'reminder') then
    return;
  end if;

  perform pg_advisory_xact_lock (hashtextextended (p_booking_id::text, 0));

  select count (*) into v_used
  from public.portal_guest_emails e
  where e.booking_id = p_booking_id
    and e.sent_at > now () - interval '24 hours'
    and e.status in ('pending', 'sent', 'skipped');
  select count (*) into v_org_used
  from public.portal_guest_emails e
  where e.organization_id = v_org
    and e.sent_at > now () - interval '24 hours'
    and e.status in ('pending', 'sent', 'skipped');
  select count (*) into v_platform_used
  from public.portal_guest_emails e
  where e.sent_at > now () - interval '24 hours'
    and e.status in ('pending', 'sent', 'skipped');
  v_room := greatest (0, least (p_cap - v_used, p_org_cap - v_org_used, p_platform_cap - v_platform_used));
  if v_room = 0 then
    return;
  end if;

  return query
  with eligible as (
    select g.id as gid
    from public.portal_guests g
    where g.booking_id = p_booking_id
      and g.email is not null
      and not g.opted_out
      and (
        (p_kind = 'invite' and g.status = 'not_sent')
        or (p_kind = 'reminder' and g.status = 'invited'
            and (g.last_sent_at is null or g.last_sent_at < now () - interval '3 days'))
      )
      and not exists (
        select 1 from public.portal_guest_emails e
        where e.guest_id = g.id and e.status = 'pending' and e.sent_at > now () - interval '5 minutes'
      )
    order by g.created_at
    limit v_room
  ),
  ins as (
    insert into public.portal_guest_emails (organization_id, booking_id, guest_id, kind, status)
    select v_org, p_booking_id, eligible.gid, p_kind, 'pending' from eligible
    returning portal_guest_emails.id, portal_guest_emails.guest_id
  )
  select ins.id, ins.guest_id from ins;
end;
$$;

revoke all on function public.portal_claim_guest_sends (uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.portal_claim_guest_sends (uuid, text, integer, integer, integer) to service_role;
