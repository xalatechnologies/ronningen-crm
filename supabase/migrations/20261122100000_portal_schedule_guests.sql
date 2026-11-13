-- The customer can show the day plan (time and title only) on the guests' invitation page.
alter table public.portal_invite_designs
  add column if not exists show_schedule boolean not null default false;

-- Column grants are explicit on this table; the customer's update policy already scopes the row.
grant update (show_schedule) on public.portal_invite_designs to authenticated;
