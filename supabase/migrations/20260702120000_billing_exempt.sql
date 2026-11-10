-- Platform operator orgs can be marked billing_exempt to skip Stripe enforcement.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_exempt boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS organizations_billing_exempt_idx
  ON public.organizations (billing_exempt)
  WHERE billing_exempt = true;

COMMENT ON COLUMN public.organizations.billing_exempt IS
  'When true, org has complimentary access and is excluded from billing enforcement and Stripe checkout.';

-- One-time: exempt the platform admin owner org.
UPDATE public.organizations o
SET billing_exempt = true
FROM public.organization_members om
JOIN public.profiles p ON p.id = om.user_id
WHERE om.organization_id = o.id
  AND om.role = 'owner'
  AND p.is_platform_admin = true
  AND lower(p.email) = 'admin@eventmanager.no';
