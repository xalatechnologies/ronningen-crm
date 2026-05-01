-- Reference venue rows (also applied via migration 20260430192100_seed_ronningen_properties.sql).
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

-- Pricing catalog defaults (see migration 20260430203000_seed_pricing_catalog.sql).
insert into public.packages (name, description, price, active)
select v.name, v.description, v.price, v.active
from (
  values
    (
      'Basis',
      E'For deg som vil gjøre det meste selv\n- Lokalleie\n- Parkering\n- Uteområde',
      26000::numeric,
      true
    ),
    (
      'Plus',
      E'Enklere og mer ferdig løsning\n- Alt i Basis\n- Oppdekning (bord, stoler, duk, stoltrekk, servietter)\n- Tilgang til kjøkken med utstyr og kjølerom\n- Lyd og Lys\n- Sluttrengjøring',
      0::numeric,
      true
    ),
    (
      'Premium',
      E'Full pakke – vi tar oss av det meste\n- Alt i Plus\n- Koordinering og planlegging\n- Dekorasjon og bordpynt\n- Catering & serveringspersonell\n- Ekstra tjenester ved behov',
      0::numeric,
      true
    ),
    (
      'Luksus',
      E'- Hele døgnet / VIP\n- Premium lyd og lys\n- Dedikert koordinator',
      32000::numeric,
      true
    )
) as v (name, description, price, active)
where not exists (select 1 from public.packages p where p.name = v.name);

insert into public.services (name, description, price, active)
select v.name, v.description, v.price, v.active
from (
  values
    ('Bar og drinker', 'Tillegg ved booking – bar', 1500::numeric, true),
    ('Blomster og grønt', 'Tillegg ved booking – blomster', 1500::numeric, true),
    ('Catering', 'Tillegg ved booking – mat', 1500::numeric, true),
    ('Dekor', 'Tillegg ved booking – dekor', 1500::numeric, true),
    ('Ekstra personale', 'Tillegg ved booking – bemanning', 1500::numeric, true),
    ('Foto', 'Tillegg ved booking – fotograf', 1500::numeric, true),
    ('Lyd og lys', 'Tillegg ved booking – teknikk', 1500::numeric, true),
    ('Musikk / DJ', 'Tillegg ved booking – musikk', 1500::numeric, true),
    ('Parkering', 'Tillegg ved booking – parkering', 1500::numeric, true),
    ('Projektor og AV-utstyr', 'Tillegg ved booking – AV', 1500::numeric, true),
    ('Renhold etter arrangement', 'Tillegg ved booking – renhold', 1500::numeric, true),
    ('Telt eller uteområde', 'Tillegg ved booking – telt/ute', 1500::numeric, true)
) as v (name, description, price, active)
where not exists (select 1 from public.services s where s.name = v.name);
