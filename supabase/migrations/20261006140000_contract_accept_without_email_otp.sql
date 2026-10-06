-- Guest accepts with typed name on the invite link. Email OTP is no longer required.

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
    'typed_name',
    coalesce(nullif(payload->>'declaration_version', ''), 'v1'),
    v_ver.language,
    v_ver.template_version_id,
    v_ver.version_number,
    v_ver.content_hash,
    false,
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

revoke all on function public.contract_accept (jsonb) from public;
grant execute on function public.contract_accept (jsonb) to service_role;
