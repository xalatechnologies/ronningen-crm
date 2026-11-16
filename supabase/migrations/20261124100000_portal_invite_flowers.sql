-- Invitation cards: flowers the customer can choose for their card (style, kind of flower, colour).
--
-- Additive and safe for existing cards: three columns with defaults ('none', 'blomst', 'accent') so every
-- existing invitation renders exactly as before. Decoration only: fixed keys, no free text.
-- APPLY THIS BEFORE deploying the code that reads/writes the columns.
--
-- NOT APPLIED automatically. Review, then apply deliberately.

alter table public.portal_invite_designs
  add column if not exists flower_style text not null default 'none',
  add column if not exists flower_type text not null default 'blomst',
  add column if not exists flower_tone text not null default 'accent';

alter table public.portal_invite_designs drop constraint if exists portal_invite_designs_flower_style_check;
alter table public.portal_invite_designs add constraint portal_invite_designs_flower_style_check
  check (flower_style in ('none', 'hjorner', 'krans', 'bukett', 'bord', 'spredt'));

alter table public.portal_invite_designs drop constraint if exists portal_invite_designs_flower_type_check;
alter table public.portal_invite_designs add constraint portal_invite_designs_flower_type_check
  check (flower_type in ('blomst', 'tusenfryd', 'ros', 'kvist'));

alter table public.portal_invite_designs drop constraint if exists portal_invite_designs_flower_tone_check;
alter table public.portal_invite_designs add constraint portal_invite_designs_flower_tone_check
  check (flower_tone in ('accent', 'rosa', 'gull', 'hvit'));

-- Column-level grants like the other design columns (select is already table-wide for the customer).
grant insert (flower_style, flower_type, flower_tone) on public.portal_invite_designs to authenticated;
grant update (flower_style, flower_type, flower_tone) on public.portal_invite_designs to authenticated;
