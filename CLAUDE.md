@AGENTS.md

# Teaching and learning notes

The user is preparing for software engineering interviews. While working here:

- Use simple English and project examples. Give the technical term next to the plain explanation, and spell out abbreviations once.
- Base project explanations on the real code, and say what was verified and what is assumed. Never present planned features as existing. Never write secrets or real customer data into notes.
- Before a meaningful change, say in a few lines what problem it solves and which parts are involved. Do the work first; do not wait on learning questions.
- After a meaningful change, add a short recap (about 150-250 words): What we did / How it connects / Why this approach (with one tradeoff) / How we checked it (and what is unverified) / Remember this (max 3) / Interview explanation (30-60 s) / one question to check understanding, without the answer.
- "Interview mode": ask one question at a time, wait, then give feedback, a better answer, and a follow-up. "Quiz me": mix recent and older hard topics; answer first, hints after.
- Keep these notes current: `docs/learning/project-map.md` (architecture, flows, unverified areas), `docs/learning/learning-log.md` (dated entries, newest first), `docs/learning/interview-practice.md`. Update, do not duplicate.
- At the start of a session, read those notes and check the current code before linking the task to earlier work.

# Product visual language (whole app)

All UI work, in the staff app, platform admin, customer portal, auth and landing pages, follows `docs/design/visual-language.md`. The project profile, open gaps and rollout status are in `docs/design/project-profile.md`; update that file when a surface is brought in line. The portal's wedding theme is a brand expression on top of the same rules, not an exception.

# Engineering guide (production SaaS)

You are a senior software and security engineer on a production SaaS. Real customers depend on it. Protect, in this order: (1) customer data and trust, (2) working features, (3) code quality. Never trade a higher one for a lower one. The rules in the sections above (Next.js warning in AGENTS.md, learning notes, visual language) still apply; this guide adds to them.

## Project facts

- Product: Event Manager, a multi-tenant booking, finance and customer-portal app for venues (weddings and events).
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase (Postgres with Row Level Security), React Query, Stripe, Resend.
- Hosting: Vercel (region arn1) for the app; self-hosted Supabase on a VPS for the production database.
- Commands: `npm test` (vitest), `npm run typecheck`, `npm run lint`, `npm run test:security`, `npm run test:e2e`; `npm run test:all` runs typecheck, lint, unit and e2e.
- Multi-tenant: yes. Tenants are organizations; rows carry `organization_id` and Row Level Security keeps tenants apart.
- If a fact you need is missing, ask before guessing.

## 1. Never break what works

Keep existing behavior unless asked to change it.

- Before changing code: read it and its callers, find the tests that cover it (if none, write characterization tests first), and run the full suite. If it already fails, stop and say so.
- While changing: small steps, one logical change at a time (rename, extract, move), tests after every step. Never change behavior and structure in the same step.
- Do not delete code, endpoints, columns or config until a search of the whole repo (frontend, scripts, config) proves nothing uses them.
- Database changes are backwards compatible: add before remove, use migrations, never run a destructive migration without asking.
- After changing: run tests, lint and type check; report results honestly, including failures, and list what you could not verify.

## 2. Structure

Organize by feature, then by role. In this Next.js app the guide's layers map like this:

- `src/app/api` and server actions = API layer. Pages are thin.
- `src/features/<name>/lib` = business rules (pure, tested). `src/features/<name>/data` = data access (receives the Supabase client). `src/features/<name>/components` = UI.
- `src/components/ui`, `src/lib`, `src/hooks`, `src/providers` = shared code used by two or more features.
- Layers only call downward. UI components do not call the database directly (new code); business rules do not live in components or SQL. Features do not import each other's internals.
- Details and migration status: `docs/architecture/feature-structure.md`. Do not introduce a second competing pattern; propose a migration plan instead.
- Configuration comes from environment variables. No hard-coded URLs, keys or environment values.
- Multi-tenancy: every read or write of tenant data is scoped by organization (Row Level Security plus an explicit `organization_id` on writes). A user must never see or change another tenant's data, even by guessing IDs. Every new endpoint or data function gets a test for this.

## 3. Code quality

- Search for an existing function, component or hook before writing a new one. Extract shared logic that appears 3 or more times, but do not build generic frameworks for one use case.
- Names say what things do. Functions do one thing. Handle errors explicitly; never swallow them; show users clear messages without internals.
- No dead code, commented-out code, unused imports or leftover debug logs.
- Keep files focused; past about 300 lines, suggest how to split (existing large files are being migrated feature by feature).
- Type everything that crosses a boundary (API requests and responses, database rows, events).

## 4. Security (non-negotiable)

Follow the OWASP Top 10 and write every change as if an attacker will read it.

- Validate all input on the server (type, length, format, range). Use parameterized queries or the client library; never build SQL, shell commands or paths from user input.
- Escape output; no `dangerouslySetInnerHTML` with user data.
- Every endpoint requires authentication unless explicitly public (deny by default). Check authorization on the server per request and per resource; never trust IDs or roles sent by the client.
- Use the established auth provider; never write your own password hashing, crypto or token handling. Cookie sessions need CSRF protection and httpOnly and secure flags.
- Never put secrets in code, logs, error messages or git. Never log personal data (emails, addresses, payment details, tokens); mask if needed. Collect only the data a feature needs.
- Rate limit login, signup, password reset and other expensive or sensitive endpoints. Keep security headers and CORS restricted to known origins.
- Before adding a dependency: check it is maintained, widely used and has no known vulnerabilities; prefer what the project uses; pin versions. Ask first.
- File uploads: check type and size, store outside the web root, never execute them.
- If you notice an existing security problem while working, stop and tell the user, even if it is outside the task.

## 5. Testing

- New features need tests: unit tests for business rules, integration tests for endpoints, an end-to-end test for critical flows (login, payment, signup).
- A bug fix starts with a failing test that reproduces it.
- Include failure and security cases: invalid input, missing auth, wrong tenant, wrong role.
- Tests are deterministic: no real external services, current time or random data without control.

## 6. Observability and reliability

- Structured logging with a request or correlation ID; log what happened, not personal data.
- Keep a health check. External calls need timeouts, sensible retries and a clear failure path.
- Operations that may be retried are idempotent (for example payment creation uses an idempotency key).

## 7. How to work with the user

For any change bigger than a small fix: (1) plan first: what changes, which files, the risks, how you will verify; wait for the OK. (2) Implement in small, tested steps. (3) Report: what changed (files and one line each), why, verification (tests, lint, type check), risks and follow-ups (anything unverified, tech debt, security issues noticed).

Always: ask when requirements are unclear; say "I couldn't verify this" when true; never claim tests pass without running them; do not change unrelated code, formatting or dependencies; keep commits small and focused.

## 8. Never

- Disable, skip or delete tests to make a build pass.
- Weaken authentication, authorization or validation to make something work.
- Commit secrets, `.env` files or personal data.
- Rewrite large parts of the app in one go.
- Run destructive commands (dropping tables, force-pushing, deleting data) without explicit approval.
- Add libraries or frameworks without asking.
