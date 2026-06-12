-- Grouped audit action counts for admin revisjonslogg (avoids full-table scan in app).

create or replace function public.audit_action_counts()
returns table(action text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select action, count(*)::bigint
  from public.platform_audit_log
  group by action
  order by count(*) desc, action asc;
$$;

revoke all on function public.audit_action_counts () from public;
grant execute on function public.audit_action_counts () to service_role;

create or replace function public.audit_unique_actors_since(since_at timestamptz)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct actor_user_id)::bigint
  from public.platform_audit_log
  where created_at >= since_at;
$$;

revoke all on function public.audit_unique_actors_since (timestamptz) from public;
grant execute on function public.audit_unique_actors_since (timestamptz) to service_role;
