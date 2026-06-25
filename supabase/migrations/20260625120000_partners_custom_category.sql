-- Tillat egendefinerte partnerkategorier (ikke bare forhåndsdefinerte nøkler).

alter table public.partners
  drop constraint if exists partners_category_check;

alter table public.partners
  add constraint partners_category_check check (
    char_length(trim(category)) >= 2
    and char_length(category) <= 80
  );

notify pgrst, 'reload schema';
