# Performance guide — Rønningen CRM

## Principles

- Server components by default; client components only for interactivity.
- Tenant data flows through React Query with `organization_id` in every query key.
- Supabase reads filter by `organization_id` explicitly (RLS is not enough for multi-org users or index use).
- Paginate or bound large lists in SQL — avoid loading full tables to filter in the browser.
- Invalidate React Query caches after mutations; avoid redundant `router.refresh()` for tenant data.

## Caching strategy

| Data | `staleTime` | Notes |
|------|-------------|-------|
| Tenant lists (default) | 60s | `tenantStaleTimes.list` |
| Dashboard | 45s | |
| Finance / reports | 30s | |
| Auth / org context | Context providers | Not in Zustand |

Global: `refetchOnWindowFocus: false`.

`QueryProvider` lives in the root layout (with `SupabaseProvider` / `AuthProvider`) so client context is not split across Turbopack chunks.

## Query key strategy

Central factory: [`src/lib/query-keys.ts`](../src/lib/query-keys.ts) (extends [`tenant-query-keys.ts`](../src/lib/queries/tenant-query-keys.ts)).

Permission-sensitive tenant keys include `role`:

- `bookings(orgId, role)`
- `inquiries(orgId, role)`
- `finance(orgId, role)`
- `invoices(orgId, role)`
- `assets(orgId, role)`
- `overnatting(orgId, ym, role)`

Invalidate via [`invalidate-tenant-queries.ts`](../src/lib/queries/invalidate-tenant-queries.ts) and `useTenantDataInvalidation()`.

## Pagination rules

- **Finance**: transactions loaded for rolling 5-year window with paged fetches (`fetch-paged.ts`).
- **Admin audit**: server `.range()` (existing).
- **Bookings / customers UI**: client pagination on fetched data — server bounds planned for very large orgs.
- **Reports**: queries bounded to report year ± 1 year.

## Server / client boundaries

- Tenant page shells: server `page.tsx` → per-route client in `src/components/app-pages/*-page-client.tsx`.
- Heavy sections: `next/dynamic` inside page clients.
- Billing / Stripe / admin service role: `import "server-only"`.

## Supabase query rules

1. `.eq("organization_id", orgId)` on reads and writes.
2. Explicit `select()` column lists — no `select("*")` in hot paths.
3. Date filters and `.limit()` in SQL for alerts, upcoming events, unpaid invoices.
4. No queries inside loops; batch with `.in()`.

## Index strategy

Existing compound indexes on `bookings`, `customers`, `transactions`, `assets`.

Additive migration [`20260624120000_performance_query_indexes.sql`](../supabase/migrations/20260624120000_performance_query_indexes.sql):

- `accommodation_reservations(organization_id, check_in_date)`
- `booking_inquiries(organization_id, created_at)`

Use `IF NOT EXISTS` only; never drop indexes in app migrations.

## Admin performance

- Admin lists should use server pagination where added (audit log pattern).
- Platform-wide aggregates remain service-role only.
- Do not extend tenant `staleTime` to admin sensitive data.

## Manual checklist

See [performance-smoke-test.md](./performance-smoke-test.md).

## Build verification

```bash
npm run typecheck
npm run lint
npm run build
```

Record route sizes from Next build output; do not invent benchmark numbers.
