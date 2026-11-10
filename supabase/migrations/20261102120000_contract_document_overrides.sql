alter table public.rental_contract_versions
  add column if not exists document_overrides jsonb not null default '{}'::jsonb;

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
      or new.document_overrides is distinct from old.document_overrides
      or new.accepted_at is distinct from old.accepted_at
    then
      raise exception 'accepted_version_immutable';
    end if;
  end if;
  return new;
end;
$$;
