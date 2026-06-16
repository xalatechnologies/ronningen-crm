/**
 * Typography class bundles — Inter only (`--font-sans`).
 *
 * Size ladder (tenant app + admin; scales with `--app-type-scale` via `text-app-*`):
 * - Page title     → RN_TEXT_PAGE_TITLE      (.app-title)
 * - Section title  → RN_TEXT_SECTION_TITLE   (.app-section-title)
 * - Card title     → RN_TEXT_CARD_TITLE      (.app-card-title)
 * - Body           → RN_TEXT_BODY            (text-app-base)
 * - Meta / secondary → RN_TEXT_META          (text-app-sm + muted)
 * - Label / caps   → RN_TEXT_LABEL           (text-app-xs uppercase)
 * - Controls       → text-app-control        (inputs, buttons — see UI primitives)
 * - KPI values     → .dashboard-kpi-value / .app-kpi
 *
 * Avoid: raw `text-sm`/`text-base`/`font-heading` (legacy; same family as body).
 * Landing: use `.landing-headline`, `.landing-subhead`, `.landing-body`.
 */

export const RN_TEXT_PAGE_TITLE = "app-title";

export const RN_TEXT_SECTION_TITLE = "app-section-title";

export const RN_TEXT_CARD_TITLE = "app-card-title";

export const RN_TEXT_BODY = "text-app-base";

export const RN_TEXT_META = "text-app-sm text-muted-foreground";

export const RN_TEXT_LABEL =
  "text-app-xs font-semibold uppercase tracking-wider text-muted-foreground";

export const RN_TEXT_CONTROL = "text-app-control";
