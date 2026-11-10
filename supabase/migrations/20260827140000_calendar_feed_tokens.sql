-- Per-organization tokenized iCalendar feed URLs for external booking-sync tools
-- (Digilist, Google Calendar, Apple Calendar, ...).
--
-- Design: one active token per organization. Owners can view/rotate/delete
-- via /app/settings/integrations. Token is stored plaintext so it can be
-- displayed and re-copied (matches Google Calendar-style "secret address"
-- pattern). Compromise → owner rotates and the old URL 404s immediately.

create table if not exists public.organization_calendar_feeds (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  created_by_user_id uuid references auth.users (id) on delete set null,
  rotated_at timestamptz
);

create index if not exists organization_calendar_feeds_token_idx
  on public.organization_calendar_feeds (token);

create index if not exists organization_calendar_feeds_org_idx
  on public.organization_calendar_feeds (organization_id);

comment on table public.organization_calendar_feeds is
  'Tokenized iCalendar feed URLs per organization. Public read via /api/calendar/<token>/bookings.ics (service role).';
comment on column public.organization_calendar_feeds.token is
  'URL-safe secret. Anyone with this value can read the org bookings feed. Rotate to invalidate.';
comment on column public.organization_calendar_feeds.last_accessed_at is
  'Updated by the feed route on each successful GET (best-effort, non-blocking).';

alter table public.organization_calendar_feeds enable row level security;

-- Owners can read their org's feed row (URL is a secret to them).
create policy "owner_select_calendar_feeds"
on public.organization_calendar_feeds for select to authenticated
using (public.has_org_role (organization_id, array['owner']));

-- Only owners can create the feed row.
create policy "owner_insert_calendar_feeds"
on public.organization_calendar_feeds for insert to authenticated
with check (public.has_org_role (organization_id, array['owner']));

-- Only owners can rotate the token.
create policy "owner_update_calendar_feeds"
on public.organization_calendar_feeds for update to authenticated
using (public.has_org_role (organization_id, array['owner']))
with check (public.has_org_role (organization_id, array['owner']));

-- Only owners can revoke the feed entirely.
create policy "owner_delete_calendar_feeds"
on public.organization_calendar_feeds for delete to authenticated
using (public.has_org_role (organization_id, array['owner']));

-- Keep updated_at fresh on any UPDATE.
create or replace function public.touch_organization_calendar_feeds_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists organization_calendar_feeds_touch_updated_at
  on public.organization_calendar_feeds;

create trigger organization_calendar_feeds_touch_updated_at
before update on public.organization_calendar_feeds
for each row execute function public.touch_organization_calendar_feeds_updated_at();
