-- Versioned template fields for the closing line, signer and signature image, plus a neutral
-- starter template for new organizations. Existing template versions get nulls, which the app
-- renders with its previous defaults.

alter table public.contract_template_versions
  add column if not exists closing_line text,
  add column if not exists signer_name text,
  add column if not exists signature_path text;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('contract-signatures', 'contract-signatures', true)
    on conflict (id) do nothing;
  end if;
end
$$;

create or replace function public.seed_starter_contract_template (p_org uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid;
  v_template uuid;
  v_terms text;
  v_payment text;
  v_declaration text;
  v_hash text;
begin
  v_actor := public.assert_authenticated_contract_writer (p_org);

  select t.id into v_template
  from public.contract_templates t
  where t.organization_id = p_org and t.is_default
  limit 1;
  if v_template is not null then
    return v_template;
  end if;

  v_terms := $terms$
4. Betingelser
• Reservasjonen er gyldig når første innbetaling er mottatt.
• Leietaker er ansvarlig for skader på lokale og inventar som oppstår under leieperioden.
• Leietaker er ansvarlig for at gjestene følger husreglene, og for å rydde og forlate lokalet til avtalt tid.
• Utleier kan avlyse avtalen dersom uforutsette forhold gjør at lokalet ikke kan brukes. Innbetalt leiesum refunderes da i sin helhet.
• Ved force majeure som gjør arrangementet umulig å gjennomføre, refunderes innbetalt leiesum i sin helhet.
• Avtalen er bindende når den er godkjent av leietaker.
$terms$;
  v_payment := 'Merk betaling med: Arrangementsdato og navn';
  v_declaration := 'Jeg bekrefter å ha lest og forstått leieavtalen.';
  v_hash := encode(
    digest(convert_to(v_terms || E'\n' || v_payment || E'\n' || v_declaration, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.contract_templates (organization_id, name, locale, is_default)
  values (p_org, 'Standard leieavtale', 'nb', true)
  returning id into v_template;

  insert into public.contract_template_versions (
    organization_id, template_id, version_number, legal_terms, payment_terms,
    acceptance_declaration, content_hash, created_by
  ) values (
    p_org, v_template, 1, v_terms, v_payment, v_declaration, v_hash, v_actor
  );

  return v_template;
end;
$$;

revoke all on function public.seed_starter_contract_template (uuid) from public, anon;
grant execute on function public.seed_starter_contract_template (uuid) to authenticated;
