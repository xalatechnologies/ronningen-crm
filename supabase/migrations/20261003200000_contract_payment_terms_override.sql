alter table public.rental_contract_versions
  add column if not exists payment_terms text not null default '';

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
      or new.payment_terms is distinct from old.payment_terms
      or new.accepted_at is distinct from old.accepted_at
    then
      raise exception 'accepted_version_immutable';
    end if;
  end if;
  return new;
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
    payment_terms = coalesce(payload->>'payment_terms', payment_terms),
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
