-- Additive Stripe billing metadata (sandbox/live sync fields)

alter table public.subscriptions
  add column if not exists provider_price_id text,
  add column if not exists provider_product_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz;

alter table public.organizations
  add column if not exists trial_ends_at timestamptz;

alter table public.stripe_webhook_events
  add column if not exists payload jsonb;

comment on column public.subscriptions.provider_price_id is 'Stripe Price ID (price_...)';
comment on column public.subscriptions.provider_product_id is 'Stripe Product ID (prod_...)';
comment on column public.subscriptions.last_synced_at is 'Last successful Stripe webhook/sync';
comment on column public.organizations.trial_ends_at is 'Denormalized trial end when status is trialing';
