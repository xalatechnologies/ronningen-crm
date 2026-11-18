-- Customer portal: the customer can e-mail a free-text message to their guest list.
--
-- 1. portal_guest_messages  the messages themselves (subject, text, who it was meant for). Written by the
--    server only; the customer can read their own booking's messages (history).
-- 2. portal_guest_emails    gains message_id and the kind 'message', so every delivery is audited and counted
--    against the same daily e-mail caps as invitations.
-- 3. portal_claim_guest_message()  claims the recipients atomically under the per-booking lock, like
--    portal_claim_guest_sends(): eligibility, the e-mail caps AND the daily message limit are enforced here.
--
-- Additive. NOT APPLIED automatically. Review, then apply deliberately.

create table if not exists public.portal_guest_messages (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  subject text not null,
  body text not null,
  audience text not null,
  activity_id uuid references public.portal_activities (id) on delete set null,
  created_by uuid,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now (),
  constraint portal_guest_messages_subject_check check (char_length (subject) between 1 and 80),
  constraint portal_guest_messages_body_check check (char_length (body) between 1 and 2000),
  constraint portal_guest_messages_audience_check check (audience in ('all', 'accepted', 'noAnswer', 'maybe', 'activity')),
  constraint portal_guest_messages_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    -- Deleting a booking removes its messages with it (delete_booking_with_contracts() needs no change).
    on delete cascade
);

create index if not exists portal_guest_messages_booking_idx on public.portal_guest_messages (booking_id, created_at desc);

alter table public.portal_guest_messages enable row level security;
revoke all on public.portal_guest_messages from anon, authenticated;
grant select on public.portal_guest_messages to authenticated;

drop policy if exists "portal_guest_messages_customer_select" on public.portal_guest_messages;
create policy "portal_guest_messages_customer_select"
on public.portal_guest_messages for select to authenticated
using (booking_id in (select public.portal_booking_ids ()));

alter table public.portal_guest_emails
  add column if not exists message_id uuid references public.portal_guest_messages (id) on delete set null;
alter table public.portal_guest_emails drop constraint if exists portal_guest_emails_kind_check;
alter table public.portal_guest_emails
  add constraint portal_guest_emails_kind_check check (kind in ('invite', 'reminder', 'message'));

create index if not exists portal_guest_emails_message_idx on public.portal_guest_emails (message_id) where message_id is not null;

create or replace function public.portal_claim_guest_message (
  p_booking_id uuid,
  p_message_id uuid,
  p_cap integer,
  p_org_cap integer,
  p_platform_cap integer,
  p_message_cap integer
)
returns table (claim_email_id uuid, claim_guest_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_audience text;
  v_activity uuid;
  v_used integer;
  v_org_used integer;
  v_platform_used integer;
  v_messages integer;
  v_room integer;
begin
  select m.organization_id, m.audience, m.activity_id
    into v_org, v_audience, v_activity
  from public.portal_guest_messages m
  where m.id = p_message_id and m.booking_id = p_booking_id;
  if v_org is null then
    return;
  end if;
  if v_audience = 'activity' and v_activity is null then
    return;
  end if;

  perform pg_advisory_xact_lock (hashtextextended (p_booking_id::text, 0));

  -- Messages that already went out in the last 24 hours (this one does not count until it has recipients).
  select count (distinct e.message_id) into v_messages
  from public.portal_guest_emails e
  where e.booking_id = p_booking_id
    and e.kind = 'message'
    and e.message_id is distinct from p_message_id
    and e.sent_at > now () - interval '24 hours'
    and e.status in ('pending', 'sent', 'skipped');
  if v_messages >= p_message_cap then
    return;
  end if;

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
        v_audience = 'all'
        or (v_audience = 'accepted' and g.status = 'accepted')
        or (v_audience = 'maybe' and g.status = 'maybe')
        or (v_audience = 'noAnswer' and g.status = 'invited')
        or (v_audience = 'activity' and exists (
          select 1 from public.portal_activity_invitees i
          where i.activity_id = v_activity and i.guest_id = g.id
        ))
      )
      -- never the same message twice to the same guest
      and not exists (
        select 1 from public.portal_guest_emails e
        where e.guest_id = g.id and e.message_id = p_message_id
      )
    order by g.created_at
    limit v_room
  ),
  ins as (
    insert into public.portal_guest_emails (organization_id, booking_id, guest_id, kind, status, message_id)
    select v_org, p_booking_id, eligible.gid, 'message', 'pending', p_message_id from eligible
    returning portal_guest_emails.id, portal_guest_emails.guest_id
  )
  select ins.id, ins.guest_id from ins;
end;
$$;

revoke all on function public.portal_claim_guest_message (uuid, uuid, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.portal_claim_guest_message (uuid, uuid, integer, integer, integer, integer) to service_role;
