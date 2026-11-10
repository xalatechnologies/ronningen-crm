-- Optional storage bucket. Ignored when storage schema is unavailable.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('contract-pdfs', 'contract-pdfs', false)
    on conflict (id) do nothing;
  end if;
end
$$;
