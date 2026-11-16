# Performance plan (2026-11-17)

## What I measured / found

| Finding | Evidence | Impact |
|---|---|---|
| Vercel functions run in **iad1 (Washington DC)**; the database is on a VPS in **Vilnius**; users are in Norway | `x-vercel-id: arn1::iad1::…` on every response; `ipinfo` for 145.223.90.45 = Vilnius; no `regions` in `vercel.json` | Every database query crosses the Atlantic twice (~100-130 ms round trip). This is the main cause of the slowness. |
| Portal pages make **4-5 sequential database round trips** per navigation | `portal/(app)/layout.tsx` → `getPortalAccess` (1: `portal_accounts`, 2: bookings+org+profile in parallel) → layout counts (3: unread + wishes) → page queries (4) | ~4-5 × 120 ms = 0.5-0.6 s of pure waiting, before any rendering |
| Layout and home page **fetch the same counts twice** (`countUnread`, `countWishAttention`) | `layout.tsx` and `portal/(app)/page.tsx` both call them; they are not wrapped in `cache()` | 2 wasted queries on the overview |
| Every portal page is `force-dynamic` (29 pages) and re-runs the full chain on each tap | `export const dynamic = "force-dynamic"` | No reuse between navigations |
| Page shell is fast, data is slow | `/auth/login` TTFB ≈ 0.32 s (static), api round trip from Norway ≈ 0.16-0.19 s | Confirms it is data latency, not rendering |
| Not yet measured | client JS bundle size, images, fonts, real-user numbers | Needs `next build` analyzer + Vercel Speed Insights |

## Plan, in order of payoff

### Phase 1: free wins, no behaviour change (1 day)
1. **Move functions next to the database**: `vercel.json` `"regions": ["arn1"]` (Stockholm; Vilnius is ~20 ms away, and Norwegian users hit it too). Expected: 100 ms → ~20 ms per query, so roughly 0.4 s faster on every portal page. Verify with `x-vercel-id` (should read `arn1::arn1`).
   - Needs the user's OK: it is a deploy config change (`vercel.json`), outside the restyle scope.
2. **Deduplicate queries per request**: wrap `countUnread` / `countWishAttention` in React `cache()` (keyed by booking id) so layout and page share them.
3. **Merge the first two round trips** in `getPortalAccess`: one query (or one Postgres RPC) that returns account + booking + organization + profile, instead of a query followed by 3 parallel ones.

### Phase 2: fewer round trips (2-3 days)
4. **One RPC per screen** (`portal_overview`, `portal_guests_page`, …) that returns everything the page needs in a single database call. Target: 1 round trip per navigation after auth.
5. **Pass the layout's data down instead of re-querying**: the badge counts only change on writes; refresh them with `revalidateTag` after a message or wish change.
6. **Short cache for rarely changing reads** (organization name/logo, design, schedule versions) using `unstable_cache`/`use cache` with tags, invalidated in the existing server actions.

### Phase 3: feel (1-2 days)
7. **Streaming**: split slow sections into `<Suspense>` so the header and cards show at once (the overview's counts are the candidate). `loading.tsx` exists only for the overview; add it for guests, wishlist, schedule, messages.
8. **Optimistic UI** for the actions people repeat (add guest, send message, tick things): update the screen first, then confirm. Already done for the nav highlight.
9. **Prefetch** the other four tabs after the first paint (`router.prefetch` on idle), so the second tap is instant.

### Phase 4: measure and guard (ongoing)
10. Turn on **Vercel Speed Insights** and log server timing per page (`Server-Timing` header with the DB time). Without numbers every later change is a guess.
11. Run `next build` with the bundle analyzer; check client JS per portal route, lazy-load the emoji tray, charts and invite designer.
12. Database: `EXPLAIN` the portal queries on the VPS; confirm indexes on `booking_id`, `organization_id`, `user_id`; check the pooler (Supavisor) is used, not direct connections.
13. Add a **budget**: p75 portal navigation under 600 ms; fail review if a page adds a sequential query.

## Expected result
- After Phase 1: ~0.3-0.5 s faster per tap (most of the gain, for little work).
- After Phase 2: one DB round trip per page; typical tap well under 400 ms.
- Phase 3 makes it feel instant even when data is still loading.

## Risks
- Region change: functions in `arn1` must reach the VPS over the public internet; confirm TLS/pooler limits under load.
- RPCs and cache tags are behaviour-adjacent: each needs tests (tenant isolation / RLS) before release. Never cache per-user data in a shared cache.
