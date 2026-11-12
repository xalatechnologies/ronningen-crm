-- Customer portal, Phase 2c: sending invitations and collecting RSVPs.
--
-- Additive. Three things:
--   1. portal_guest_tokens  one row per secret guest link (SHA-256 only, never the link itself).
--      A guest can have several valid links (invitation + reminders); all are revoked together when
--      the guest is deleted or their e-mail changes. Server-only: RLS on, no client privileges.
--   2. portal_guest_emails  audit trail + daily send limit per booking. Server-only.
--   3. organizations.portal_guest_invites_enabled  the venue's switch for customers e-mailing guests
--      under the venue's brand. DEFAULT OFF.
-- Plus two counters on portal_guests used to rate-limit the public RSVP page.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

alter table public.organizations
  add column if not exists portal_guest_invites_enabled boolean not null default false;

alter table public.portal_guests
  add column if not exists rsvp_count integer not null default 0,
  add column if not exists last_rsvp_at timestamptz;

create table if not exists public.portal_guest_tokens (
  token_hash text primary key,
  guest_id uuid not null references public.portal_guests (id) on delete cascade,
  created_at timestamptz not null default now ()
);

create index if not exists portal_guest_tokens_guest_idx on public.portal_guest_tokens (guest_id);

create table if not exists public.portal_guest_emails (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  guest_id uuid references public.portal_guests (id) on delete set null,
  kind text not null,
  status text not null,
  provider_message_id text,
  error text,
  sent_at timestamptz not null default now (),
  constraint portal_guest_emails_kind_check check (kind in ('invite', 'reminder')),
  constraint portal_guest_emails_status_check check (status in ('sent', 'skipped', 'failed')),
  constraint portal_guest_emails_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict
);

create index if not exists portal_guest_emails_booking_idx on public.portal_guest_emails (booking_id, sent_at);

-- Server-only tables: RLS on, no policies, no client privileges.
alter table public.portal_guest_tokens enable row level security;
alter table public.portal_guest_emails enable row level security;
revoke all on public.portal_guest_tokens, public.portal_guest_emails from anon, authenticated;
