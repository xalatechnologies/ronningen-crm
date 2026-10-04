-- Digital rental contracts: versioned frozen documents, hashed tokens,
-- immutable acceptance evidence, and a durable job queue.
-- Staff RPCs require auth.uid(); they do not inherit the service-role skip
-- in assert_can_write_reservations.

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  locale text not null default 'nb',
  is_default boolean not null default false,
  optional_clauses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_templates_org_id_key unique (organization_id, id)
);

create unique index if not exists contract_templates_one_default_idx
  on public.contract_templates (organization_id)
  where is_default;

create table if not exists public.contract_template_versions (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  template_id uuid not null,
  version_number integer not null,
  legal_terms text not null,
  payment_terms text not null default '',
  acceptance_declaration text not null,
  content_hash text not null,
  published_at timestamptz not null default now(),
  created_by uuid,
  constraint contract_template_versions_template_fk
    foreign key (organization_id, template_id)
    references public.contract_templates (organization_id, id)
    on delete restrict,
  constraint contract_template_versions_unique unique (template_id, version_number),
  constraint contract_template_versions_org_id_key unique (organization_id, id)
);

create table if not exists public.rental_contracts (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  booking_id uuid not null,
  customer_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_contracts_booking_fk
    foreign key (organization_id, booking_id)
    references public.bookings (organization_id, id)
    on delete restrict,
  constraint rental_contracts_customer_fk
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict,
  constraint rental_contracts_booking_unique unique (booking_id),
  constraint rental_contracts_org_id_key unique (organization_id, id)
);

create table if not exists public.rental_contract_versions (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  contract_id uuid not null,
  version_number integer not null,
  status text not null,
  processing_status text not null default 'idle',
  template_id uuid,
  template_version_id uuid,
  expected_base_accepted_version_id uuid,
  replaces_version_id uuid,
  source_snapshot jsonb not null default '{}'::jsonb,
  frozen_document jsonb,
  content_hash text,
  special_terms text not null default '',
  include_internal_notes boolean not null default false,
  customer_facing_notes text,
  language text not null default 'nb',
  expires_at timestamptz,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  accepted_at timestamptz,
  withdrawn_at timestamptz,
  superseded_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_contract_versions_status_check
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'expired', 'cancelled', 'superseded')),
  constraint rental_contract_versions_processing_check
    check (processing_status in (
      'idle', 'pdf_queued', 'pdf_generating', 'pdf_ready', 'pdf_failed',
      'email_queued', 'email_sent', 'email_delivered', 'email_bounced', 'email_failed'
    )),
  constraint rental_contract_versions_contract_fk
    foreign key (organization_id, contract_id)
    references public.rental_contracts (organization_id, id)
    on delete restrict,
  constraint rental_contract_versions_unique unique (contract_id, version_number),
  constraint rental_contract_versions_org_id_key unique (organization_id, id),
  constraint rental_contract_versions_frozen_when_issued
    check (
      status = 'draft'
      or (frozen_document is not null and content_hash is not null)
    )
);

create unique index if not exists rental_contract_versions_one_draft
  on public.rental_contract_versions (contract_id)
  where status = 'draft';

create unique index if not exists rental_contract_versions_one_outstanding
  on public.rental_contract_versions (contract_id)
  where status in ('sent', 'viewed');

create table if not exists public.contract_access_tokens (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  version_id uuid not null,
  token_hash text not null unique,
  purpose text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contract_access_tokens_purpose_check
    check (purpose in ('invite', 'download')),
  constraint contract_access_tokens_version_fk
    foreign key (organization_id, version_id)
    references public.rental_contract_versions (organization_id, id)
    on delete restrict
);

create table if not exists public.contract_signing_sessions (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  version_id uuid not null,
  session_token_hash text not null unique,
  email text not null,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_verified_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contract_signing_sessions_version_fk
    foreign key (organization_id, version_id)
    references public.rental_contract_versions (organization_id, id)
    on delete restrict
);

create table if not exists public.contract_acceptances (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  contract_id uuid not null,
  version_id uuid not null unique,
  reservation_id uuid not null,
  customer_id uuid not null,
  customer_name text not null,
  customer_email text,
  company_name text,
  accepted_full_name text not null,
  signing_method text not null default 'typed_name_email_otp',
  declaration_version text not null,
  document_language text not null,
  terms_version_id uuid,
  contract_version_number integer not null,
  content_hash text not null,
  mailbox_verified boolean not null default false,
  accepted_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  constraint contract_acceptances_version_fk
    foreign key (organization_id, version_id)
    references public.rental_contract_versions (organization_id, id)
    on delete restrict
);

create unique index if not exists contract_acceptances_idempotency_idx
  on public.contract_acceptances (version_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  contract_id uuid not null,
  version_id uuid,
  event_type text not null,
  actor_type text not null,
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contract_events_contract_idx
  on public.contract_events (contract_id, created_at);

create table if not exists public.contract_artifacts (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  version_id uuid not null unique,
  storage_path text not null,
  pdf_hash text not null,
  byte_size integer not null,
  generated_at timestamptz not null default now(),
  generation_metadata jsonb not null default '{}'::jsonb,
  constraint contract_artifacts_version_fk
    foreign key (organization_id, version_id)
    references public.rental_contract_versions (organization_id, id)
    on delete restrict
);

create table if not exists public.contract_jobs (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  version_id uuid not null,
  job_type text not null,
  unique_key text not null unique,
  status text not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  run_after timestamptz not null default now(),
  leased_until timestamptz,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_jobs_type_check
    check (job_type in (
      'generate_pdf', 'email_invite', 'email_reminder', 'email_accepted', 'email_new_version'
    )),
  constraint contract_jobs_status_check
    check (status in ('queued', 'leased', 'succeeded', 'failed', 'cancelled'))
);

create table if not exists public.contract_email_deliveries (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  job_id uuid references public.contract_jobs (id) on delete restrict,
  version_id uuid not null,
  to_email text not null,
  template_key text not null,
  provider text not null default 'resend',
  provider_message_id text,
  idempotency_key text not null unique,
  status text not null default 'queued',
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_email_deliveries_status_check
    check (status in ('queued', 'provider_accepted', 'delivered', 'bounced', 'failed'))
);

alter table public.contract_templates enable row level security;
alter table public.contract_template_versions enable row level security;
alter table public.rental_contracts enable row level security;
alter table public.rental_contract_versions enable row level security;
alter table public.contract_access_tokens enable row level security;
alter table public.contract_signing_sessions enable row level security;
alter table public.contract_acceptances enable row level security;
alter table public.contract_events enable row level security;
alter table public.contract_artifacts enable row level security;
alter table public.contract_jobs enable row level security;
alter table public.contract_email_deliveries enable row level security;

create policy "org_select_contract_templates"
on public.contract_templates for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_write_contract_templates"
on public.contract_templates for all to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']))
with check (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create policy "org_select_contract_template_versions"
on public.contract_template_versions for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_insert_contract_template_versions"
on public.contract_template_versions for insert to authenticated
with check (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create policy "org_select_rental_contracts"
on public.rental_contracts for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_rental_contract_versions"
on public.rental_contract_versions for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_contract_acceptances"
on public.contract_acceptances for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_contract_events"
on public.contract_events for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_contract_artifacts"
on public.contract_artifacts for select to authenticated
using (organization_id in (select public.user_organization_ids ()));

create policy "org_select_contract_jobs"
on public.contract_jobs for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

create policy "org_select_contract_email_deliveries"
on public.contract_email_deliveries for select to authenticated
using (public.has_org_role (organization_id, array['owner', 'admin', 'manager']));

-- No authenticated policies on tokens/sessions (hash lookup via definer RPCs only).

create or replace function public.contract_prevent_mutation ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'immutable_contract_record';
end;
$$;

drop trigger if exists contract_acceptances_no_update on public.contract_acceptances;
create trigger contract_acceptances_no_update
before update or delete on public.contract_acceptances
for each row execute function public.contract_prevent_mutation ();

drop trigger if exists contract_events_no_update on public.contract_events;
create trigger contract_events_no_update
before update or delete on public.contract_events
for each row execute function public.contract_prevent_mutation ();

drop trigger if exists contract_artifacts_no_update on public.contract_artifacts;
create trigger contract_artifacts_no_update
before update or delete on public.contract_artifacts
for each row execute function public.contract_prevent_mutation ();

drop trigger if exists contract_template_versions_no_update on public.contract_template_versions;
create trigger contract_template_versions_no_update
before update or delete on public.contract_template_versions
for each row execute function public.contract_prevent_mutation ();

create or replace function public.contract_prevent_accepted_version_mutation ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'immutable_contract_record';
  end if;
  if old.status = 'accepted' then
    if new.status is distinct from old.status
      or new.frozen_document is distinct from old.frozen_document
      or new.content_hash is distinct from old.content_hash
      or new.special_terms is distinct from old.special_terms
      or new.accepted_at is distinct from old.accepted_at
    then
      raise exception 'accepted_version_immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists rental_contract_versions_protect_accepted
  on public.rental_contract_versions;
create trigger rental_contract_versions_protect_accepted
before update or delete on public.rental_contract_versions
for each row execute function public.contract_prevent_accepted_version_mutation ();

create or replace function public.prevent_delete_booking_with_contracts ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.rental_contracts c
    where c.booking_id = old.id and c.organization_id = old.organization_id
  ) then
    raise exception 'booking_has_contract_history';
  end if;
  return old;
end;
$$;

drop trigger if exists bookings_prevent_delete_with_contracts on public.bookings;
create trigger bookings_prevent_delete_with_contracts
before delete on public.bookings
for each row execute function public.prevent_delete_booking_with_contracts ();

create or replace function public.assert_authenticated_contract_writer (p_org_id uuid)
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication_required';
  end if;
  if p_org_id is null then
    raise exception 'organization_id_required';
  end if;
  if not public.has_org_role (p_org_id, array['owner', 'admin', 'manager']) then
    raise exception 'forbidden';
  end if;
  return v_uid;
end;
$$;

revoke all on function public.assert_authenticated_contract_writer (uuid) from public;
grant execute on function public.assert_authenticated_contract_writer (uuid) to authenticated;

create or replace function public.contract_append_event (
  p_org uuid,
  p_contract uuid,
  p_version uuid,
  p_type text,
  p_actor_type text,
  p_actor uuid,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contract_events (
    organization_id, contract_id, version_id, event_type, actor_type, actor_user_id, metadata
  ) values (
    p_org, p_contract, p_version, p_type, p_actor_type, p_actor, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.contract_append_event (uuid, uuid, uuid, text, text, uuid, jsonb) from public;
grant execute on function public.contract_append_event (uuid, uuid, uuid, text, text, uuid, jsonb)
  to authenticated, service_role;

create or replace function public.contract_create_draft (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_booking uuid;
  v_actor uuid;
  v_contract uuid;
  v_customer uuid;
  v_next int;
  v_version uuid;
  v_base uuid;
  v_template uuid;
  v_template_version uuid;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_booking := nullif(payload->>'booking_id', '')::uuid;
  v_actor := public.assert_authenticated_contract_writer (v_org);

  select b.customer_id into v_customer
  from public.bookings b
  where b.id = v_booking and b.organization_id = v_org;
  if v_customer is null then
    raise exception 'booking_not_found';
  end if;

  insert into public.rental_contracts (organization_id, booking_id, customer_id)
  values (v_org, v_booking, v_customer)
  on conflict (booking_id) do update
    set updated_at = now()
  returning id into v_contract;

  perform pg_advisory_xact_lock (hashtextextended(v_contract::text, 0));

  if exists (
    select 1 from public.rental_contract_versions v
    where v.contract_id = v_contract and v.status = 'draft'
  ) then
    raise exception 'draft_already_exists';
  end if;

  select v.id into v_base
  from public.rental_contract_versions v
  where v.contract_id = v_contract and v.status = 'accepted'
  order by v.version_number desc
  limit 1;

  select coalesce(max(version_number), 0) + 1 into v_next
  from public.rental_contract_versions
  where contract_id = v_contract;

  v_template := nullif(payload->>'template_id', '')::uuid;
  if v_template is null then
    select t.id into v_template
    from public.contract_templates t
    where t.organization_id = v_org and t.is_default
    limit 1;
  end if;

  if v_template is not null then
    select tv.id into v_template_version
    from public.contract_template_versions tv
    where tv.template_id = v_template
      and tv.organization_id = v_org
    order by tv.version_number desc
    limit 1;
  end if;

  insert into public.rental_contract_versions (
    organization_id,
    contract_id,
    version_number,
    status,
    template_id,
    template_version_id,
    expected_base_accepted_version_id,
    source_snapshot,
    special_terms,
    include_internal_notes,
    customer_facing_notes,
    language,
    created_by
  ) values (
    v_org,
    v_contract,
    v_next,
    'draft',
    v_template,
    v_template_version,
    v_base,
    coalesce(payload->'source_snapshot', '{}'::jsonb),
    coalesce(payload->>'special_terms', ''),
    coalesce((payload->>'include_internal_notes')::boolean, false),
    nullif(payload->>'customer_facing_notes', ''),
    coalesce(nullif(payload->>'language', ''), 'nb'),
    v_actor
  )
  returning id into v_version;

  perform public.contract_append_event (
    v_org, v_contract, v_version, 'created', 'staff', v_actor, '{}'::jsonb
  );

  return jsonb_build_object(
    'contractId', v_contract,
    'versionId', v_version,
    'versionNumber', v_next
  );
end;
$$;

create or replace function public.contract_update_draft (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_version uuid;
  v_actor uuid;
  v_contract uuid;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_version := nullif(payload->>'version_id', '')::uuid;
  v_actor := public.assert_authenticated_contract_writer (v_org);

  select v.contract_id into v_contract
  from public.rental_contract_versions v
  where v.id = v_version
    and v.organization_id = v_org
    and v.status = 'draft'
  for update;
  if v_contract is null then
    raise exception 'draft_not_found';
  end if;

  update public.rental_contract_versions
  set
    source_snapshot = coalesce(payload->'source_snapshot', source_snapshot),
    special_terms = coalesce(payload->>'special_terms', special_terms),
    include_internal_notes = coalesce(
      (payload->>'include_internal_notes')::boolean,
      include_internal_notes
    ),
    customer_facing_notes = case
      when payload ? 'customer_facing_notes' then nullif(payload->>'customer_facing_notes', '')
      else customer_facing_notes
    end,
    template_id = coalesce(nullif(payload->>'template_id', '')::uuid, template_id),
    template_version_id = coalesce(nullif(payload->>'template_version_id', '')::uuid, template_version_id),
    updated_at = now()
  where id = v_version;

  perform public.contract_append_event (
    v_org, v_contract, v_version, 'draft_updated', 'staff', v_actor, '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'versionId', v_version);
end;
$$;

create or replace function public.contract_send_version (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_version uuid;
  v_actor uuid;
  v_contract uuid;
  v_row public.rental_contract_versions%rowtype;
  v_outstanding uuid;
  v_base uuid;
  v_hash text;
  v_invite_hash text;
  v_expires timestamptz;
  v_job_key text;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_version := nullif(payload->>'version_id', '')::uuid;
  v_invite_hash := nullif(payload->>'invite_token_hash', '');
  v_actor := public.assert_authenticated_contract_writer (v_org);

  if coalesce((payload->>'legal_terms_approved')::boolean, false) is not true then
    raise exception 'legal_terms_not_approved';
  end if;
  if coalesce((payload->>'contracts_enabled')::boolean, false) is not true then
    raise exception 'contracts_not_enabled';
  end if;

  select * into v_row
  from public.rental_contract_versions v
  where v.id = v_version and v.organization_id = v_org
  for update;
  if v_row.id is null or v_row.status <> 'draft' then
    raise exception 'draft_not_found';
  end if;
  v_contract := v_row.contract_id;

  perform pg_advisory_xact_lock (hashtextextended(v_contract::text, 0));

  select v.id into v_base
  from public.rental_contract_versions v
  where v.contract_id = v_contract and v.status = 'accepted'
  order by v.version_number desc
  limit 1;

  if v_row.expected_base_accepted_version_id is distinct from v_base then
    raise exception 'base_accepted_version_changed';
  end if;

  v_hash := nullif(payload->>'content_hash', '');
  if v_hash is null or payload->'frozen_document' is null then
    raise exception 'frozen_document_required';
  end if;
  if v_invite_hash is null then
    raise exception 'invite_token_hash_required';
  end if;

  select v.id into v_outstanding
  from public.rental_contract_versions v
  where v.contract_id = v_contract
    and v.status in ('sent', 'viewed')
    and v.id <> v_version
  for update;

  if v_outstanding is not null then
    update public.rental_contract_versions
    set
      status = 'superseded',
      superseded_at = now(),
      updated_at = now()
    where id = v_outstanding;

    update public.contract_access_tokens
    set revoked_at = now()
    where version_id = v_outstanding
      and revoked_at is null;

    update public.contract_signing_sessions
    set consumed_at = now()
    where version_id = v_outstanding
      and consumed_at is null;

    perform public.contract_append_event (
      v_org, v_contract, v_outstanding, 'superseded', 'staff', v_actor,
      jsonb_build_object('replacedBy', v_version)
    );
  end if;

  v_expires := coalesce(nullif(payload->>'expires_at', '')::timestamptz, now() + interval '14 days');

  update public.rental_contract_versions
  set
    status = 'sent',
    frozen_document = payload->'frozen_document',
    content_hash = v_hash,
    replaces_version_id = coalesce(v_outstanding, v_base),
    sent_at = now(),
    expires_at = v_expires,
    updated_at = now()
  where id = v_version;

  insert into public.contract_access_tokens (
    organization_id, version_id, token_hash, purpose, expires_at
  ) values (
    v_org, v_version, v_invite_hash, 'invite', v_expires
  );

  v_job_key := 'email_invite:' || v_version::text || ':' || v_invite_hash;
  insert into public.contract_jobs (
    organization_id, version_id, job_type, unique_key, payload
  ) values (
    v_org, v_version, 'email_invite', v_job_key,
    jsonb_build_object('purpose', 'invite')
  )
  on conflict (unique_key) do nothing;

  perform public.contract_append_event (
    v_org, v_contract, v_version, 'sent', 'staff', v_actor, '{}'::jsonb
  );

  return jsonb_build_object(
    'ok', true,
    'versionId', v_version,
    'expiresAt', v_expires,
    'supersededVersionId', v_outstanding
  );
end;
$$;

create or replace function public.contract_withdraw_offer (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_version uuid;
  v_actor uuid;
  v_contract uuid;
  v_status text;
begin
  v_org := nullif(payload->>'organization_id', '')::uuid;
  v_version := nullif(payload->>'version_id', '')::uuid;
  v_actor := public.assert_authenticated_contract_writer (v_org);

  select v.contract_id, v.status into v_contract, v_status
  from public.rental_contract_versions v
  where v.id = v_version and v.organization_id = v_org
  for update;
  if v_contract is null then
    raise exception 'version_not_found';
  end if;
  if v_status not in ('sent', 'viewed') then
    raise exception 'not_outstanding_offer';
  end if;

  update public.rental_contract_versions
  set status = 'cancelled', withdrawn_at = now(), updated_at = now()
  where id = v_version;

  update public.contract_access_tokens
  set revoked_at = now()
  where version_id = v_version and revoked_at is null;

  update public.contract_signing_sessions
  set consumed_at = now()
  where version_id = v_version and consumed_at is null;

  perform public.contract_append_event (
    v_org, v_contract, v_version, 'withdrawn', 'staff', v_actor, '{}'::jsonb
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.contract_lookup_invite (p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tok public.contract_access_tokens%rowtype;
  v_ver public.rental_contract_versions%rowtype;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return null;
  end if;

  select * into v_tok
  from public.contract_access_tokens
  where token_hash = p_token_hash
    and purpose = 'invite'
    and revoked_at is null
    and expires_at > now();
  if v_tok.id is null then
    return null;
  end if;

  select * into v_ver
  from public.rental_contract_versions
  where id = v_tok.version_id
    and status in ('sent', 'viewed', 'accepted');
  if v_ver.id is null then
    return null;
  end if;

  update public.contract_access_tokens
  set last_used_at = now()
  where id = v_tok.id;

  return jsonb_build_object(
    'organizationId', v_ver.organization_id,
    'contractId', v_ver.contract_id,
    'versionId', v_ver.id,
    'status', v_ver.status,
    'tokenId', v_tok.id
  );
end;
$$;

create or replace function public.contract_open_session (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite jsonb;
  v_session_hash text;
  v_email text;
  v_expires timestamptz;
  v_id uuid;
begin
  v_invite := public.contract_lookup_invite (payload->>'invite_token_hash');
  if v_invite is null then
    return null;
  end if;
  if v_invite->>'status' not in ('sent', 'viewed') then
    -- accepted: still allow session for receipt/pdf after separate download token
    if v_invite->>'status' <> 'accepted' then
      return null;
    end if;
  end if;

  v_session_hash := nullif(payload->>'session_token_hash', '');
  v_email := nullif(payload->>'email', '');
  if v_session_hash is null or v_email is null then
    raise exception 'session_required';
  end if;
  v_expires := now() + interval '12 hours';

  insert into public.contract_signing_sessions (
    organization_id, version_id, session_token_hash, email, expires_at
  ) values (
    (v_invite->>'organizationId')::uuid,
    (v_invite->>'versionId')::uuid,
    v_session_hash,
    lower(v_email),
    v_expires
  )
  returning id into v_id;

  return jsonb_build_object(
    'sessionId', v_id,
    'organizationId', v_invite->>'organizationId',
    'contractId', v_invite->>'contractId',
    'versionId', v_invite->>'versionId',
    'status', v_invite->>'status',
    'expiresAt', v_expires
  );
end;
$$;

create or replace function public.contract_record_view (p_session_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess public.contract_signing_sessions%rowtype;
  v_ver public.rental_contract_versions%rowtype;
begin
  select * into v_sess
  from public.contract_signing_sessions
  where session_token_hash = p_session_token_hash
    and consumed_at is null
    and expires_at > now();
  if v_sess.id is null then
    return null;
  end if;

  select * into v_ver
  from public.rental_contract_versions
  where id = v_sess.version_id
  for update;
  if v_ver.status not in ('sent', 'viewed') then
    return jsonb_build_object('status', v_ver.status, 'recorded', false);
  end if;

  if v_ver.status = 'sent' then
    update public.rental_contract_versions
    set status = 'viewed', first_viewed_at = coalesce(first_viewed_at, now()), updated_at = now()
    where id = v_ver.id;
    perform public.contract_append_event (
      v_ver.organization_id, v_ver.contract_id, v_ver.id, 'viewed', 'customer', null, '{}'::jsonb
    );
  end if;

  return jsonb_build_object('status', 'viewed', 'recorded', true);
end;
$$;

create or replace function public.contract_store_otp (
  p_session_token_hash text,
  p_otp_hash text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.contract_signing_sessions
  set otp_hash = p_otp_hash, otp_expires_at = p_expires_at, otp_verified_at = null
  where session_token_hash = p_session_token_hash
    and consumed_at is null
    and expires_at > now();
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.contract_confirm_otp (
  p_session_token_hash text,
  p_otp_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.contract_signing_sessions
  set otp_verified_at = now()
  where session_token_hash = p_session_token_hash
    and consumed_at is null
    and expires_at > now()
    and otp_hash = p_otp_hash
    and otp_expires_at > now();
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

create or replace function public.contract_accept (payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sess public.contract_signing_sessions%rowtype;
  v_ver public.rental_contract_versions%rowtype;
  v_contract public.rental_contracts%rowtype;
  v_existing public.contract_acceptances%rowtype;
  v_id uuid;
  v_name text;
  v_key text;
begin
  select * into v_sess
  from public.contract_signing_sessions
  where session_token_hash = payload->>'session_token_hash'
  for update;
  if v_sess.id is null or v_sess.expires_at <= now() then
    raise exception 'session_invalid';
  end if;

  select * into v_ver
  from public.rental_contract_versions
  where id = v_sess.version_id
  for update;
  if v_ver.id is null then
    raise exception 'version_not_found';
  end if;

  perform pg_advisory_xact_lock (hashtextextended(v_ver.contract_id::text, 0));

  select * into v_existing
  from public.contract_acceptances
  where version_id = v_ver.id;
  if v_existing.id is not null then
    return jsonb_build_object(
      'ok', true,
      'replay', true,
      'acceptanceId', v_existing.id,
      'acceptedAt', v_existing.accepted_at,
      'versionId', v_ver.id
    );
  end if;

  if v_sess.consumed_at is not null then
    raise exception 'session_consumed';
  end if;
  if v_sess.otp_verified_at is null then
    raise exception 'otp_required';
  end if;
  if v_ver.status not in ('sent', 'viewed') then
    raise exception 'not_outstanding_offer';
  end if;
  if v_ver.expires_at is not null and v_ver.expires_at <= now() then
    raise exception 'offer_expired';
  end if;
  if v_ver.content_hash is distinct from payload->>'content_hash' then
    raise exception 'content_hash_mismatch';
  end if;
  if coalesce((payload->>'terms_accepted')::boolean, false) is not true
     or coalesce((payload->>'read_accepted')::boolean, false) is not true then
    raise exception 'declarations_required';
  end if;

  v_name := trim(coalesce(payload->>'full_name', ''));
  if length(v_name) < 2 then
    raise exception 'full_name_required';
  end if;

  v_key := nullif(payload->>'idempotency_key', '');

  select * into v_contract from public.rental_contracts where id = v_ver.contract_id;

  insert into public.contract_acceptances (
    organization_id,
    contract_id,
    version_id,
    reservation_id,
    customer_id,
    customer_name,
    customer_email,
    company_name,
    accepted_full_name,
    signing_method,
    declaration_version,
    document_language,
    terms_version_id,
    contract_version_number,
    content_hash,
    mailbox_verified,
    ip,
    user_agent,
    idempotency_key,
    metadata
  ) values (
    v_ver.organization_id,
    v_ver.contract_id,
    v_ver.id,
    v_contract.booking_id,
    v_contract.customer_id,
    coalesce(payload->>'customer_name', v_name),
    v_sess.email,
    nullif(payload->>'company_name', ''),
    v_name,
    'typed_name_email_otp',
    coalesce(nullif(payload->>'declaration_version', ''), 'v1'),
    v_ver.language,
    v_ver.template_version_id,
    v_ver.version_number,
    v_ver.content_hash,
    true,
    nullif(payload->>'ip', '')::inet,
    nullif(payload->>'user_agent', ''),
    v_key,
    jsonb_build_object(
      'replacesVersionId', v_ver.replaces_version_id
    )
  )
  returning id, accepted_at into v_id, v_existing.accepted_at;

  update public.rental_contract_versions
  set
    status = 'accepted',
    accepted_at = now(),
    processing_status = 'pdf_queued',
    updated_at = now()
  where id = v_ver.id;

  update public.contract_signing_sessions
  set consumed_at = now()
  where id = v_sess.id;

  update public.contract_access_tokens
  set revoked_at = now()
  where version_id = v_ver.id
    and purpose = 'invite'
    and revoked_at is null;

  insert into public.contract_jobs (
    organization_id, version_id, job_type, unique_key, payload
  ) values (
    v_ver.organization_id,
    v_ver.id,
    'generate_pdf',
    'generate_pdf:' || v_ver.id::text,
    '{}'::jsonb
  )
  on conflict (unique_key) do nothing;

  perform public.contract_append_event (
    v_ver.organization_id, v_ver.contract_id, v_ver.id, 'accepted', 'customer', null,
    jsonb_build_object('acceptanceId', v_id)
  );

  return jsonb_build_object(
    'ok', true,
    'replay', false,
    'acceptanceId', v_id,
    'acceptedAt', now(),
    'versionId', v_ver.id
  );
end;
$$;

create or replace function public.contract_expire_outstanding ()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  for r in
    select id, organization_id, contract_id
    from public.rental_contract_versions
    where status in ('sent', 'viewed')
      and expires_at is not null
      and expires_at <= now()
    for update skip locked
  loop
    update public.rental_contract_versions
    set status = 'expired', updated_at = now()
    where id = r.id;
    update public.contract_access_tokens
    set revoked_at = now()
    where version_id = r.id and revoked_at is null;
    perform public.contract_append_event (
      r.organization_id, r.contract_id, r.id, 'expired', 'system', null, '{}'::jsonb
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Grants: staff RPCs to authenticated only. Guest RPCs to service_role only.
revoke all on function public.contract_create_draft (jsonb) from public;
revoke all on function public.contract_update_draft (jsonb) from public;
revoke all on function public.contract_send_version (jsonb) from public;
revoke all on function public.contract_withdraw_offer (jsonb) from public;
revoke all on function public.contract_lookup_invite (text) from public;
revoke all on function public.contract_open_session (jsonb) from public;
revoke all on function public.contract_record_view (text) from public;
revoke all on function public.contract_store_otp (text, text, timestamptz) from public;
revoke all on function public.contract_confirm_otp (text, text) from public;
revoke all on function public.contract_accept (jsonb) from public;
revoke all on function public.contract_expire_outstanding () from public;

grant execute on function public.contract_create_draft (jsonb) to authenticated;
grant execute on function public.contract_update_draft (jsonb) to authenticated;
grant execute on function public.contract_send_version (jsonb) to authenticated;
grant execute on function public.contract_withdraw_offer (jsonb) to authenticated;

grant execute on function public.contract_lookup_invite (text) to service_role;
grant execute on function public.contract_open_session (jsonb) to service_role;
grant execute on function public.contract_record_view (text) to service_role;
grant execute on function public.contract_store_otp (text, text, timestamptz) to service_role;
grant execute on function public.contract_confirm_otp (text, text) to service_role;
grant execute on function public.contract_accept (jsonb) to service_role;
grant execute on function public.contract_expire_outstanding () to service_role;
