# Interview practice

Only claim what is true for you. Replace the bracketed parts with your real role and results. Do not invent metrics.

## 30-second introduction (draft)

"I work on Event Manager, a multi-tenant web app for venues that rent out space for weddings and events. It is built with Next.js, TypeScript and Supabase on Postgres. Staff manage inquiries, bookings, invoices and finance. Customers get a portal to plan the event with guests and a schedule. [My part: ...]"

## Two-minute architecture (draft)

Next.js app on Vercel. Server components render pages and read data. The login session is a cookie that middleware refreshes on each request. Data is in Postgres on Supabase. Every row has an `organization_id`, and Row Level Security keeps venues apart. Some writes go through SQL functions (for example `create_booking_atomic`) so they run as one transaction and can be safely retried. External services: Stripe for subscriptions (webhooks), Resend for email (webhook for delivery events), Mapbox for addresses. Three scheduled jobs run daily from `vercel.json`. Tests: Vitest unit tests and one Playwright smoke test; CI runs typecheck, lint and unit tests.

## Feature end to end: "create a booking" (draft)

See `project-map.md`, section 6. Key points to say: permission check in SQL, idempotency key, one transaction, database-level double-booking constraint, query cache invalidation, error mapping.

## Debugging example (true story, from project memory)

After moving the production database to a new server, the customer portal returned 403 on one table. Cause: a permissions reset removed column-level grants, and my table-level check could not see them. I found it in the API gateway logs, re-applied the grants from the migration files, and checked allowed and denied columns. Lesson: compare column-level privileges, not only table-level ones.
[Check what you personally did before using this as your story.]

## Decision and tradeoff

Browser talks to Postgres directly (via Supabase) instead of a custom API.
- Benefit: less code, fast to build.
- Cost: security lives in RLS and SQL; mistakes there are serious and harder to test.
- Alternative: a backend API layer that checks permissions in code.

## Practice questions

1. What stops a manager from one venue reading another venue's bookings?
2. What happens if a user double-clicks "Create booking"?
3. How is a Stripe webhook different from a normal API call?
4. What is the difference between authentication and authorization in this app?
5. Why use an exclusion constraint instead of checking dates in JavaScript?

## Frontend design system questions (added 2026-11-21)

- Why share a table scaffold but not the cell content? (Behaviour stays in the page; duplication goes away; low risk.)
- A shared `cn()` silently removed font sizes. How did you find it and fix it at the root? (Symptom in one component, cause in tailwind-merge config; measured font sizes on seven pages before and after.)
- How do you stop colour drift? (Tokens, status classes, and a test that fails when a file gains raw colour values.)
- How do you refactor many pages without breaking them? (Keep state and handlers in the page, test the shared piece, check each page in the browser, release in small PRs.)

## Learning gaps (update as we go)

- Not yet explained in my own words: RLS, idempotency, webhooks.
- Not yet traced: contract signing, Stripe webhook, portal guest flow.
