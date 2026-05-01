-- Extra tilleggstjenester for booking (idempotent på navn). Eksisterende
-- rader fra seed (Catering, Foto, Musikk / DJ, Dekor) hoppes over.
insert into public.services (name, description, price, active)
select v.name, v.description, v.price, v.active
from (
  values
    ('Bar og drinker', 'Tillegg ved booking – bar', 1500::numeric, true),
    ('Lyd og lys', 'Tillegg ved booking – teknikk', 1500::numeric, true),
    ('Renhold etter arrangement', 'Tillegg ved booking – renhold', 1500::numeric, true),
    ('Ekstra personale', 'Tillegg ved booking – bemanning', 1500::numeric, true),
    ('Parkering', 'Tillegg ved booking – parkering', 1500::numeric, true),
    ('Blomster og grønt', 'Tillegg ved booking – blomster', 1500::numeric, true),
    ('Telt eller uteområde', 'Tillegg ved booking – telt/ute', 1500::numeric, true),
    ('Projektor og AV-utstyr', 'Tillegg ved booking – AV', 1500::numeric, true)
) as v (name, description, price, active)
where not exists (select 1 from public.services s where s.name = v.name);
