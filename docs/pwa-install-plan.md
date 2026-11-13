# Install-as-app (PWA) — plan

Status: **PROPOSAL — nothing built.** Goal: when someone opens the site on a phone, **never ask if the app is
already installed, and ask once, politely, if it is not.** One installable app, "Event Manager", for venue staff and
customers. Guests (`/i/[token]`) are never prompted.

---

## 1. What exists today (checked in the repo)

| Piece | State |
|---|---|
| `app/manifest.ts` / web app manifest | **missing** |
| Icons | `apple-touch-icon.png` 180, `icon.png` 32, `event-manager-logo.png` 1024. **No 192 / 512 / maskable** |
| Service worker | **none** |
| `viewport.themeColor`, `appleWebApp` metadata | **missing** |
| Middleware | protects `/app`, `/admin`, `/portal`; `/manifest.webmanifest`, `/sw.js`, icons are public (not in a protected prefix) |
| Security headers | HSTS, nosniff, frame DENY, referrer policy, permissions policy. No CSP, so a same-origin worker needs no new rule |
| Next.js 16 guide | `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`: manifest via `app/manifest.ts`; install prompts do not need offline support |

## 2. How "already installed?" can really be known (it differs by platform)

| Situation | What we can detect | Reliability |
|---|---|---|
| Running **inside** the installed app | `matchMedia("(display-mode: standalone)")`, `navigator.standalone` (iOS) | exact |
| **Android / desktop Chromium** (Chrome, Edge, Samsung Internet), page open in the browser | The browser fires `beforeinstallprompt` **only when installable and not installed**. No event after load = installed or not installable | good |
| Chromium, extra signal | `navigator.getInstalledRelatedApps()` with `related_applications` in the manifest | best effort (Chrome Android) |
| Install happens now | `appinstalled` event | exact |
| **iPhone / iPad Safari** | **No install API, no install event, no way to ask "is it on the home screen?"** from the browser | not detectable |
| Firefox Android | Own install menu, no prompt event | not detectable |

**Consequence (said plainly):** we can guarantee "no prompt inside the app" everywhere and "no prompt if installed"
on Chromium. On iPhone we cannot know, so we show a calm one-time instruction card with an **"Already added"** button
and a long cooldown. This is a platform limit, not something code can remove.

## 3. Decision logic (one pure function, unit-tested)

```
decide({ standalone, platform, hasDeferredPrompt, installedFlag, dismissals, lastDismissedAt, route, now })
  -> "none" | "install-button" | "ios-instructions"
```

Order of rules, first match wins:

1. `standalone` → **none** (and remember `installed`).
2. Route not eligible (guest page, public contract, admin, auth pages) → **none**.
3. `installedFlag` (set by `appinstalled`, by a standalone launch, or "Already added") → **none**.
4. Dismissed within 14 days, or dismissed 3 times → **none** (the menu entry stays available).
5. Not a phone/tablet (coarse pointer) → **none** in v1.
6. Chromium and `hasDeferredPrompt` → **install-button** (native prompt on tap).
7. iOS Safari (not standalone) → **ios-instructions** (Share → Add to Home Screen), 90-day cooldown.
8. Anything else → **none**.

Never auto-open the native prompt: `beforeinstallprompt` is captured with `preventDefault()` and `prompt()` is called
**only from the user's tap**.

## 4. UX

- **Where:** after sign-in, on the first load of `/portal` and `/app` (not on the login page, not on first visit to
  the marketing page). A **permanent "Installer appen" entry** in the portal header and the venue user menu while
  installable.
- **What:** a non-blocking bottom sheet, logo + one line ("Åpne raskere og få varsler: legg appen på
  hjemskjermen") + **Installer** / **Ikke nå**. On the portal it sits above the bottom tab bar and respects
  `safe-area-inset-bottom`. 44px targets, focus managed, `role="dialog"` non-modal, Escape/close works.
- **iPhone sheet:** three numbered steps with the Share and Add icons, **Jeg har lagt den til** and **Ikke nå**.
- **After install:** one toast "Appen er installert", then never again.
- Copy in nb and en (`parts/portal.ts` or a small `pwa` part), no marketing language.

## 5. Architecture

| Layer | File | Notes |
|---|---|---|
| Manifest | `src/app/manifest.ts` | `id: "/"`, `name: "Event Manager"`, `short_name`, `start_url: "/open?source=pwa"`, `scope: "/"`, `display: "standalone"`, `theme_color` / `background_color` from tokens, icons 192, 512 and **maskable 512**, `related_applications` (webapp) for `getInstalledRelatedApps` |
| Launch route | `src/app/open/route.ts` | Reads the session: staff → `/app/dashboard`, customer → `/portal`, none → `/auth/login`. One install, right landing for everyone |
| Icons | `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` | Generated once from the 1024 logo (script in `scripts/`, committed output), maskable with safe-zone padding |
| Head | `layout.tsx` | `viewport.themeColor`, `metadata.appleWebApp` (`capable`, `title`, `statusBarStyle`), existing apple-touch-icon |
| State | `src/lib/pwa/install-state.ts` (+ test) | The pure `decide()` and storage helpers (`localStorage`, try/catch) |
| Capture | `src/components/pwa/install-provider.tsx` (client) | Listens for `beforeinstallprompt`, `appinstalled`, display-mode changes; exposes `install()`, `state`; mounted in the portal and venue layouts only |
| UI | `install-banner.tsx`, `ios-install-sheet.tsx`, menu item | Uses existing Sheet and Button components |
| Worker | `public/sw.js` + registration in the provider (production only) | See section 6 |
| Headers | `next.config.ts` | `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`; `Content-Type: application/javascript` |

## 6. Service worker policy (privacy first)

This is a multi-tenant app with personal data (guest lists, diets, prices). The worker must **never** make private
pages available to the next person on a shared phone.

- Precache **only** a static `/offline` page and the icons.
- **Network-only** for everything else: no HTML, no `/api`, no RSC payloads, nothing under `/app`, `/portal`, `/i`,
  `/auth`, `/admin`.
- On navigation failure show `/offline` ("Du er frakoblet. Prøv igjen."), never stale data.
- Versioned cache name; `skipWaiting` + `clients.claim` only for this tiny worker; an `unregister` escape hatch behind
  an env flag. Update check on each load (`updateViaCache: "none"`, as in the Next guide).
- Sign-out clears nothing sensitive because nothing sensitive is cached.

## 7. Delivery in phases

| Phase | Scope | Done when |
|---|---|---|
| **P1 Installable** | Icons, manifest, head tags, `/open` route, `/sw.js` headers | Chrome DevTools → Application shows "installable", no warnings; Lighthouse installable passes |
| **P2 Smart prompt** | `decide()` + tests, provider, bottom sheet, iOS sheet, menu entry, nb/en copy | Behaves per section 3 on the device matrix below |
| **P3 Offline shell** | `sw.js`, `/offline`, registration (production) | Airplane mode shows the offline page; no private page ever served from cache |
| **P4 (optional, later)** | Web push for new messages / prices / answers (VAPID keys, subscription table, server send). Needs the installed app on iPhone (iOS 16.4+) | Separate plan |

Each phase ships on its own and changes no existing behaviour.

## 8. Test plan

- **Unit:** `decide()` for every rule and edge (standalone, ineligible route, cooldown, 3 dismissals, iOS, no
  event, flag set), storage failure (private mode throws), clock boundaries.
- **Manual device matrix:** Android Chrome (not installed → prompt; installed → silent; uninstall → prompt after
  cooldown rules), Samsung Internet, iPhone Safari (instructions, "already added"), iPhone Chrome, installed app on
  both OSes (no prompt, correct landing), desktop Chrome (no prompt in v1), Firefox Android (no prompt).
- **Landing:** installed app opened as staff, as customer, signed out, and with an expired session.
- **Audits:** Lighthouse PWA/installable, `next build` clean, a11y pass on the sheet (keyboard, screen reader).
- **Privacy check:** with the worker active, sign out and go offline: no private page loads.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| iPhone cannot be detected | Honest one-time card, "Already added", 90-day cooldown, permanent menu entry |
| Nagging users | Eligible routes only, after sign-in, 14-day cooldown, 3-strike stop |
| Worker caches private data | Network-only policy, only `/offline` and icons cached, test in section 8 |
| Stale worker after a deploy | Versioned cache, `no-cache` on `/sw.js`, update check on load |
| Chrome heuristics hide the prompt | Menu entry, plus the sheet only appears when the event actually fired |
| Wrong landing for dual roles | `/open` decides by session; staff-and-customer users land in `/app` |
| Venue branding on the home-screen icon | Out of scope (one platform-branded app); per-venue manifests are a later option |

## 10. Assumptions made (change before build if wrong)

1. **One app for staff and customers** ("Event Manager"), landing decided by `/open`.
2. **Phones and tablets only** in v1.
3. **Prompt after sign-in** in `/portal` and `/app`, plus the menu entry; not on the marketing page or the login form.
4. Cooldowns: **14 days** after "Ikke nå", **3** dismissals then stop, **90 days** on iPhone.
5. **No new dependency** (no Serwist/next-pwa): a ~40-line worker is enough while it only serves `/offline`.
6. Push notifications are **not** part of this build.

## 11. Estimate

P1 about half a day, P2 about a day, P3 about half a day, device testing about half a day. About 2.5 days in total,
one PR per phase.
