-- Harden per Supabase security advisors (search_path + RPC exposure)
-- Applied via Supabase MCP / dashboard; mirrors supabase/schema.sql updates.

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user () from public;
revoke all on function public.current_profile_role () from public;
grant execute on function public.current_profile_role () to authenticated;
