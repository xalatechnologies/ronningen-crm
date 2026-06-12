-- Enriched in-app notifications: categories, priority, org scope, acknowledgment.

alter table public.user_notifications
  add column if not exists category text not null default 'platform',
  add column if not exists priority text not null default 'normal',
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade,
  add column if not exists event_key text,
  add column if not exists action_url text,
  add column if not exists action_label text,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists metadata jsonb not null default '{}';

alter table public.user_notifications
  drop constraint if exists user_notifications_priority_check;

alter table public.user_notifications
  add constraint user_notifications_priority_check
  check (priority in ('low', 'normal', 'high'));

alter table public.user_notifications
  drop constraint if exists user_notifications_category_check;

alter table public.user_notifications
  add constraint user_notifications_category_check
  check (
    category in (
      'platform',
      'billing',
      'booking',
      'inquiry',
      'team',
      'support',
      'accommodation'
    )
  );

create index if not exists user_notifications_user_read_created_idx
  on public.user_notifications (user_id, read_at, created_at desc);

create index if not exists user_notifications_user_org_read_idx
  on public.user_notifications (user_id, organization_id, read_at);

grant delete on table public.user_notifications to authenticated;

create policy "users_delete_own_notifications"
on public.user_notifications for delete to authenticated
using (user_id = auth.uid());
