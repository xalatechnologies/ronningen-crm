-- current_profile_role: SECURITY INVOKER (safe with read_profiles_authenticated; clears advisor 0029)
-- Explicit revokes: triggers do not need client EXECUTE on handle_new_user

create or replace function public.current_profile_role ()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.handle_new_user () from anon;
revoke execute on function public.handle_new_user () from authenticated;
revoke execute on function public.current_profile_role () from anon;
grant execute on function public.current_profile_role () to authenticated;
