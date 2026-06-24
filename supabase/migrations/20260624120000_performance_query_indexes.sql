-- Performance indexes for tenant date-scoped queries (reports, overnatting).

create index if not exists accommodation_reservations_org_check_in_idx
  on public.accommodation_reservations (organization_id, check_in_date);

create index if not exists booking_inquiries_org_created_at_idx
  on public.booking_inquiries (organization_id, created_at);
