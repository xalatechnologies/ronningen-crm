-- Plus tier for three-package marketing grid (idempotent on name).
insert into public.packages (name, description, price, active)
select v.name, v.description, v.price, v.active
from (
  values
    (
      'Plus',
      E'Enklere og mer ferdig løsning\n- Alt i Basis\n- Oppdekning (bord, stoler, duk, stoltrekk, servietter)\n- Tilgang til kjøkken med utstyr og kjølerom\n- Lyd og Lys\n- Sluttrengjøring',
      0::numeric,
      true
    )
) as v (name, description, price, active)
where not exists (
  select 1
  from public.packages p
  where lower(trim(p.name)) in ('plus', 'plus pakke')
);
