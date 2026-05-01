-- Default Rønningen venues for the booking form property dropdown.
insert into public.properties (name, type)
select v.name, v.type
from (
  values
    ('Rønningen selskaplokalet', 'selskaplokale'),
    ('Rønningen gård', 'gård')
) as v (name, type)
where not exists (
  select 1 from public.properties p where p.name = v.name
);
