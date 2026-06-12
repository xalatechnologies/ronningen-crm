-- Webhook idempotency: processed_at is set only after successful handling.
-- Null means pending or failed (Stripe may retry).

alter table public.stripe_webhook_events
  alter column processed_at drop not null,
  alter column processed_at drop default;

comment on column public.stripe_webhook_events.processed_at is
  'Set when webhook handling completes successfully; null while pending or after failure awaiting retry';
