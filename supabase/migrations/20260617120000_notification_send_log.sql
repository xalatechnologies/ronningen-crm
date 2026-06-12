-- Idempotency log for platform notification sends (welcome, trial, campaign, etc.).

create table if not exists public.platform_notification_send_log (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  recipient_email text not null,
  context_key text not null,
  created_at timestamptz not null default now(),
  unique (template_key, recipient_email, context_key)
);

create index if not exists platform_notification_send_log_created_at_idx
  on public.platform_notification_send_log (created_at desc);

alter table public.platform_notification_send_log enable row level security;

revoke all on table public.platform_notification_send_log from public;
grant all on table public.platform_notification_send_log to service_role;
