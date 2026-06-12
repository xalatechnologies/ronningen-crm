-- Platform operations: login events, support, impersonation, feature flags, notifications, job runs

create table if not exists public.platform_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists platform_login_events_user_id_idx
  on public.platform_login_events (user_id, created_at desc);

alter table public.organizations
add column if not exists last_activity_at timestamptz;

create table if not exists public.platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'open'
    check (status in ('open', 'waiting', 'resolved')),
  subject text not null,
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_support_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ip_address text
);

create table if not exists public.platform_feature_flags (
  key text primary key,
  description text not null default '',
  enabled_global boolean not null default false,
  rollout_percentage int not null default 0
    check (rollout_percentage >= 0 and rollout_percentage <= 100),
  organization_overrides jsonb not null default '{}',
  enabled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  subject text not null,
  body_html text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_key text references public.platform_email_templates (key) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.platform_notification_campaigns (id) on delete set null,
  recipient_email text not null,
  status text not null default 'sent'
    check (status in ('sent', 'delivered', 'opened', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null default 'success'
    check (status in ('success', 'warning', 'failed')),
  metadata jsonb not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

insert into public.platform_feature_flags (key, description, enabled_global)
values
  ('billing_enabled', 'Selvbetjent Stripe-fakturering', false),
  ('ai_features', 'AI-funksjoner', false),
  ('sms_notifications', 'SMS-varsler', false),
  ('public_booking_widget', 'Offentlig booking-widget', false),
  ('new_reports', 'Nye rapporter', false)
on conflict (key) do nothing;

alter table public.platform_login_events enable row level security;
alter table public.platform_support_tickets enable row level security;
alter table public.platform_support_notes enable row level security;
alter table public.platform_impersonation_sessions enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.platform_email_templates enable row level security;
alter table public.platform_notification_campaigns enable row level security;
alter table public.platform_notification_deliveries enable row level security;
alter table public.platform_job_runs enable row level security;
