do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rental_contract_versions'
  ) then
    execute 'alter publication supabase_realtime add table public.rental_contract_versions';
  end if;
end $$;
