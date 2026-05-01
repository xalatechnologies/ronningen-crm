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
