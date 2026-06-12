-- In-app user notifications (toasts in /app on login and while active).

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null,
  template_key text,
  campaign_id uuid references public.platform_notification_campaigns (id) on delete set null,
  context_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, context_key)
);

create index if not exists user_notifications_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

revoke all on table public.user_notifications from public;
grant select, update on table public.user_notifications to authenticated;
grant all on table public.user_notifications to service_role;

create policy "users_select_own_notifications"
on public.user_notifications for select to authenticated
using (user_id = auth.uid());

create policy "users_update_own_notifications"
on public.user_notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter publication supabase_realtime add table public.user_notifications;
