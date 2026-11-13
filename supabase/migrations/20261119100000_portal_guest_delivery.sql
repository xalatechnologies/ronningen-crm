-- Customer portal: delivery tracking for guest e-mails.
--
-- Resend reports what happened after an e-mail was handed over (delivered, delayed, bounced, complained)
-- through a signed webhook. The webhook stores it on the e-mail row and, when something is wrong, on the
-- guest so the customer can see "this address did not receive the invitation" and fix it.
--
-- Additive: new nullable columns, one index, one column grant (customers may READ delivery_issue,
-- never write it) and one trigger function body extended (an e-mail change clears the old problem).
--
-- NOT APPLIED automatically. Review, then apply deliberately.

alter table public.portal_guests add column if not exists delivery_issue text;
alter table public.portal_guests drop constraint if exists portal_guests_delivery_issue_check;
alter table public.portal_guests
  add constraint portal_guests_delivery_issue_check check (delivery_issue is null or delivery_issue in ('delayed', 'bounced'));

alter table public.portal_guest_emails add column if not exists delivery text;
alter table public.portal_guest_emails add column if not exists delivery_at timestamptz;
alter table public.portal_guest_emails drop constraint if exists portal_guest_emails_delivery_check;
alter table public.portal_guest_emails
  add constraint portal_guest_emails_delivery_check check (delivery is null or delivery in ('delivered', 'delayed', 'bounced', 'complained'));

create index if not exists portal_guest_emails_provider_idx
  on public.portal_guest_emails (provider_message_id)
  where provider_message_id is not null;

grant select (delivery_issue) on public.portal_guests to authenticated;

-- A new address is a new delivery: forget the old problem (everything else is as in the hardening migration).
create or replace function public.portal_guests_email_change ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    new.delivery_issue := null;
  end if;
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
