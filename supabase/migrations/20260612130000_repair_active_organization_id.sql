-- Repair profiles stuck without active_organization_id despite having memberships.

update public.profiles p
set active_organization_id = picked.organization_id
from (
  select distinct on (om.user_id)
    om.user_id,
    om.organization_id
  from public.organization_members om
  order by om.user_id, om.created_at asc
) as picked
where p.id = picked.user_id
  and p.active_organization_id is null;
