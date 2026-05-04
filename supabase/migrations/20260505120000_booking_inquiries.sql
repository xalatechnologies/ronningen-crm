-- Forespørsler: egne rader før bekreftet booking, med aktivitetslogg og konvertering til booking.

create table if not exists public.booking_inquiries (
  id uuid primary key default gen_random_uuid (),
  customer_id uuid not null references public.customers (id) on delete restrict,
  property_id uuid references public.properties (id) on delete set null,
  event_type text not null default 'Privat',
  fest_type text,
  preferred_event_date date,
  preferred_event_end_date date,
  guest_count integer not null default 0,
  estimated_total numeric(14, 2),
  status text not null default 'new',
  next_follow_up_at timestamptz,
  internal_notes text,
  converted_booking_id uuid references public.bookings (id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_inquiries_status_chk check (
    status in (
      'new',
      'contacted',
      'quote_sent',
      'awaiting_customer',
      'converted',
      'lost'
    )
  )
);

create index if not exists booking_inquiries_status_followup_idx
  on public.booking_inquiries (status, next_follow_up_at);

create index if not exists booking_inquiries_converted_booking_id_idx
  on public.booking_inquiries (converted_booking_id);

create index if not exists booking_inquiries_customer_id_idx
  on public.booking_inquiries (customer_id);

create index if not exists booking_inquiries_updated_at_idx
  on public.booking_inquiries (updated_at desc);

comment on table public.booking_inquiries is
  'Forespørsel om booking; konverteres til public.bookings når avtale er bekreftet.';

create table if not exists public.booking_inquiry_activities (
  id uuid primary key default gen_random_uuid (),
  inquiry_id uuid not null references public.booking_inquiries (id) on delete cascade,
  body text not null,
  kind text not null default 'note',
  created_at timestamptz not null default now(),
  constraint booking_inquiry_activities_kind_chk check (kind in ('note', 'status_change'))
);

create index if not exists booking_inquiry_activities_inquiry_created_idx
  on public.booking_inquiry_activities (inquiry_id, created_at desc);

comment on table public.booking_inquiry_activities is
  'Tidslinje for oppfølging av forespørsel.';

drop trigger if exists trg_booking_inquiries_updated_at on public.booking_inquiries;

create trigger trg_booking_inquiries_updated_at
before update on public.booking_inquiries
for each row execute function public.set_updated_at ();

alter table public.booking_inquiries enable row level security;

alter table public.booking_inquiry_activities enable row level security;

create policy "read_booking_inquiries_authenticated"
on public.booking_inquiries for select
to authenticated using (true);

create policy "owner_admin_modify_booking_inquiries"
on public.booking_inquiries for all
to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));

create policy "read_booking_inquiry_activities_authenticated"
on public.booking_inquiry_activities for select
to authenticated using (true);

create policy "owner_admin_modify_booking_inquiry_activities"
on public.booking_inquiry_activities for all
to authenticated
using (public.current_profile_role () in ('owner', 'admin'))
with check (public.current_profile_role () in ('owner', 'admin'));
