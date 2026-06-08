-- SaaS: organizations, members, subscriptions (fresh DB — no backfill).

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  slug text not null,
  logo_url text,
  subscription_status text not null default 'trialing',
  subscription_plan text not null default 'starter',
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint organizations_slug_chk check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint organizations_slug_unique unique (slug)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now (),
  constraint organization_members_role_chk check (
    role in ('owner', 'admin', 'manager', 'accountant', 'viewer')
  ),
  constraint organization_members_org_user_unique unique (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null default 'starter',
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists subscriptions_organization_id_idx
  on public.subscriptions (organization_id);

alter table public.profiles
add column if not exists active_organization_id uuid references public.organizations (id) on delete set null;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at ();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at ();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
