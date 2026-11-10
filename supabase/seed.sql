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

-- ============================================================
-- LOCAL DEV ONLY: dev Auth user with a known password (matches src/config/dev-login.ts).
-- Lives here, not in migrations, so `supabase db push` can never create it in production.
-- ============================================================

-- Creates the local dev Auth user matching src/config/dev-login.ts defaults.
-- Safe to re-run: skips if admin@ronningen.no already exists.
-- Do not use as-is in production (known dev password).

DO $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower('admin@ronningen.no')) THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    'admin@ronningen.no',
    crypt('Admin1234@', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}',
    now(),
    now()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object(
      'sub', new_id::text,
      'email', 'admin@ronningen.no',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );
END $$;

UPDATE public.profiles
SET role = 'admin'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = lower('admin@ronningen.no'));

-- GoTrue scans auth.users token columns as non-null strings. SQL-seeded users must use '' not NULL.
-- https://github.com/supabase/auth/discussions/1940

UPDATE auth.users
SET
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  email_change = coalesce(email_change, ''),
  phone_change = coalesce(phone_change::text, '')::character varying,
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
WHERE lower(email) = lower('admin@ronningen.no');
