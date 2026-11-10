-- A package can point at its own contract template; null means "use the organization default".
alter table public.packages
  add column if not exists contract_template_id uuid references public.contract_templates (id) on delete set null;
