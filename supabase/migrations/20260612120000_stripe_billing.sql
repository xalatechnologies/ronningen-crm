-- Stripe billing: one subscription per org, webhook idempotency, billing email.

alter table public.organizations
add column if not exists billing_email text;

-- Keep one subscription row per organization.
delete from public.subscriptions s1
using public.subscriptions s2
where s1.organization_id = s2.organization_id
  and s1.created_at < s2.created_at;

create unique index if not exists subscriptions_organization_id_unique
  on public.subscriptions (organization_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now ()
);

alter table public.stripe_webhook_events enable row level security;

-- Grandfather legacy orgs without Stripe: 30-day trial window from migration.
update public.subscriptions s
set
  current_period_start = coalesce(s.current_period_start, now()),
  current_period_end = coalesce(s.current_period_end, now() + interval '30 days')
from public.organizations o
where s.organization_id = o.id
  and s.provider_subscription_id is null
  and s.current_period_end is null
  and o.subscription_status = 'trialing';
