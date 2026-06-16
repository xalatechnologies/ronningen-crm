# Stitch import: Rønningen Manager Dashboard

Source: `stitch_r_nningen_manager_dashboard.zip` (Google Stitch export).

## Contents

| File | Description |
|------|-------------|
| `DESIGN.md` | Design system spec — **Forest Minimalist** (YAML front matter + guidelines): colors, Inter typography, spacing, components. |
| `code.html` | Standalone HTML using **Tailwind CDN** + Material Symbols; dashboard layout with sidebar, KPI cards, and charts section. Not wired to Next.js. |
| `screen.png` | Raster preview of the screen. |

## Using this in the Next app

- **Tokens:** Align `src/styles/tokens.css` and `src/app/globals.css` with the YAML in `DESIGN.md` if you want the live app to match Stitch (primary is deep forest `#002d1c`, background `#f9faf6`, etc.).
- **UI:** Translate `code.html` into React under `src/app/app/dashboard/` (and shared layout) rather than iframing the HTML file — the prototype uses `cdn.tailwindcss.com`, which is not suitable for production in Next.
- **Fonts:** Production app uses **Inter only** via `next/font` in `src/app/layout.tsx`. Stitch `code.html` still references Manrope historically; treat it as archive reference only.

Re-export additional screens from Stitch into sibling folders under `stitch-reference/` for side-by-side reference.
