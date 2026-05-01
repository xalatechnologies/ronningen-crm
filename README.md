# Rønningen Manager

Property finance and event venue management (foundation). Feature screens are intentionally minimal placeholders so they can be replaced later via **Google Stitch MCP** (or similar design-to-code workflows).

## Tech stack

- **Framework:** Next.js (App Router) + React + TypeScript + Turbopack (`next dev --turbopack`)
- **Styling:** Tailwind CSS v4 + design tokens (`src/styles/tokens.css`, `src/app/globals.css`)
- **UI:** shadcn/ui (Base UI primitives) + Lucide React
- **Data & auth:** Supabase (Auth, Postgres, Storage-ready client split)
- **Forms & validation:** React Hook Form + Zod
- **Server state:** TanStack Query
- **Client state:** Zustand (`src/store/app-store.ts`)
- **Charts (dependency only):** Recharts (not used in UI yet)
- **Dates:** date-fns (installed; use when wiring features)
- **Quality:** ESLint (Next + TypeScript) + Prettier + TypeScript `strict`

## Requirements

- Node.js 20+
- npm (lockfile in repo)
- A Supabase project (Auth + Postgres) for real authentication and data

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and fill in:

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side scripts / admin ops only — never expose to the client) |

   Without public keys, the app uses **placeholder** Supabase URLs during build/SSR so `next build` succeeds; auth and data will not work until real keys are set.

   **Local test sign-in:** In development, `/auth/login` is pre-filled with `admin@ronningen.no` / `Admin1234@` (see `src/config/dev-login.ts`). On a **new** Supabase project, apply migrations (includes `seed_dev_auth_admin`) so that user exists; or add the user under **Authentication → Users**, or use **Register**. Optional env overrides: `NEXT_PUBLIC_DEV_LOGIN_EMAIL`, `NEXT_PUBLIC_DEV_LOGIN_PASSWORD`.

   If sign-in returns **Database error querying schema**, Auth (GoTrue) expects empty strings—not SQL `NULL`—on several `auth.users` token columns for SQL-created users; see migration `auth_users_gotrue_token_empty_strings` and [supabase/auth#1940](https://github.com/supabase/auth/issues/1940).

3. **Supabase database**

   - Open the **SQL Editor** in the Supabase dashboard.
   - Run the contents of `supabase/schema.sql` (single source of truth for DDL + RLS), **or** apply `supabase/migrations/20260430140000_init.sql` if you use the Supabase CLI.
   - Optionally run or adapt `supabase/seed.sql`.

4. **Auth URLs (dashboard)**

   In Supabase → Authentication → URL configuration, set **Site URL** and **Redirect URLs** to match your app (e.g. `http://localhost:3000` for local dev).

5. **Generate types (when ready)**

   ```bash
   npm run db:types
   ```

   Replace `src/types/database.types.ts` with generated output when you start using the full schema in app code.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:types` | Placeholder hint for `supabase gen types` |
| `npm run db:push` | Placeholder hint for CLI `db push` |
| `npm run db:seed` | Placeholder hint for seeding |

## Folder structure (high level)

- `src/app/` — App Router routes (`/` marketing shell, `/auth/*`, `/app/*` protected shell)
- `src/components/ui/` — shadcn components
- `src/components/layout/` — Sidebar, header, mobile nav, protected layout
- `src/components/shared/` — Layout primitives (page shell, states, section card)
- `src/config/` — `app`, `routes`, `navigation`
- `src/constants/` — Roles, domain status constants
- `src/hooks/` — `use-mobile`, `use-auth-user`
- `src/lib/` — `utils`, `validations`, `supabase/*`, `role-access`
- `src/providers/` — React Query + Supabase browser provider
- `src/store/` — Zustand app store
- `src/types/` — App, auth, and database typings
- `src/styles/` — `tokens.css`
- `supabase/` — `schema.sql`, `migrations/`, `seed.sql`

## Authentication & routing

- **Middleware** (`src/middleware.ts`) refreshes the Supabase session and:
  - Sends unauthenticated users on `/app/*` to `/auth/login` (with `?redirect=`).
  - Sends authenticated users away from `/auth/*` to `/app`.
- **Protected UI** lives under `src/app/app/` and uses `ProtectedLayout` (sidebar + header + mobile sheet).
- Auth pages use simple React Hook Form + Zod placeholders only.

> **Note:** Next.js 16 may log that the `middleware` file convention is deprecated in favor of `proxy` for advanced cases. This template keeps standard Supabase session refresh in `middleware` until you migrate to the new API.

## Row Level Security (summary)

RLS is defined in `supabase/schema.sql`:

- All authenticated users may **read** core tables.
- **Owner** and **admin** may **insert/update/delete** on all listed tables.
- **Accountant** may **insert/update/delete** on `transactions`, `packages`, and `services`.
- **Viewer** is read-only via policies (no write policies other than self-profile update where applicable).

Adjust policies as product rules harden (e.g. restrict profile role changes to service-side logic).

## Adding Stitch MCP / generated screens

### Downloading code and images from Stitch

The project on [stitch.withgoogle.com](https://stitch.withgoogle.com/projects/10088061850876568795) loads as a client-side app; a plain HTTP `GET` of that URL does **not** return per-screen HTML or hosted asset URLs you can scrape.

**Option A — Export in the Stitch UI:** Open a screen → **⋯** (More) → **Export** → download the `.zip` or copy code. For a full project, use the app menu **Download project** ([export walkthrough](https://www.youtube.com/watch?v=UDFl8iJYLsQ)).

**Option B — API / script (this repo):** Use [google-labs-code/stitch-sdk](https://github.com/google-labs-code/stitch-sdk) with `STITCH_API_KEY` (same credential as Stitch MCP / AI Studio). Put the key in **`.env.local`** (never commit), optional `STITCH_PROJECT_ID`, then:

```bash
npm run stitch:export
```

(`package.json` runs `node --env-file=.env.local` so the key can live only in `.env.local`.) Or:

```bash
export STITCH_API_KEY="your-key"
export STITCH_PROJECT_ID=10088061850876568795
node scripts/stitch-export.mjs
```

Output directory: **`stitch-export/`** (gitignored). For each listed screen you get **`code.html`**, **`screen.png`**, and a local **`assets/`** subtree with rewritten URLs; the first listed design system is also written as **`DESIGN.md`** when the API returns theme markdown. Folder names are **slugified from Stitch screen titles** (they correspond to your screens such as Dashboard, Bookings, Reports, Clients, Revenue, and the design system).

**Cursor MCP (same API):** This repo includes **`.cursor/mcp.json`** pointing at `https://stitch.googleapis.com/mcp` with `X-Goog-Api-Key: ${env:STITCH_API_KEY}` so the key is not committed. Ensure **`STITCH_API_KEY` is in the environment of the Cursor app** (shell profile, login item, or your OS user env). `.env.local` is loaded by Next.js and `npm run stitch:export`, but Cursor may not read `.env.local` for MCP—if Stitch MCP fails to authenticate, export the variable globally or duplicate it where Cursor documents for your OS.

### Reference export checked into the repo

A UI-export zip was unpacked under **`stitch-reference/r-nningen-manager-dashboard/`** (`DESIGN.md`, `code.html`, `screen.png`, and a short README). Use that folder as the source of truth when matching the Next.js dashboard to Stitch.

### Integrating into this Next.js app

1. Keep route segments under `src/app/app/<segment>/page.tsx` or adjust `src/config/routes.ts` + navigation together.
2. Prefer composing **layout primitives** (`PageShell`, `SectionCard`, shared states) rather than duplicating shell markup.
3. Replace placeholder copy (“… will be generated with Stitch MCP”) with generated UI; avoid coupling to fake business data.
4. Wire data with TanStack Query + Supabase clients (`server` in Server Components / Route Handlers, `browser` + provider in Client Components).

## Development rules (project)

- Mobile-first layout and spacing; sidebar is desktop-first, sheet navigation on small viewports.
- Server Components by default; `"use client"` only for interactivity, forms, and browser-only APIs.
- No dashboards, charts, or mock finance UI beyond placeholders.
- Use design tokens and Tailwind semantic colors (`background`, `primary`, `sidebar`, …).
- Prefer small, composable components and strong TypeScript types.
- File names: **kebab-case**; React components: **PascalCase** exports.
- Imports: alias `@/*` → `src/*`.

## Manual Supabase checklist

1. Create project; copy URL + anon key into `.env.local`.
2. Run `supabase/schema.sql` in the SQL editor (or migrate via CLI).
3. Configure Auth URLs and email templates if using magic links / reset emails.
4. Create at least one **owner** or **admin** profile row (or update `role` via SQL after first signup) so RLS write policies can be exercised.
5. (Optional) Enable Storage buckets when you add file features; keys in env are already named for future service-role scripts.

## License

Private / unpublished — configure as needed for your org.
