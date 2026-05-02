/** Display density presets — values mirror `src/styles/display-density.css` (keep in sync). */

export const displayStorageKey = "ronningen-crm";

export type DisplayDensity = "compact" | "comfortable" | "spacious";

/**
 * Global type: `--app-readability-scale`, `--app-read-boost` in display-density.css.
 * Body copy uses the read scale; keep presets in sync with `--app-font-scale` / spacing only.
 */
export const compact = {
  fontScale: 0.96,
  spacingScale: 0.82,
  cardPaddingPx: 14,
  pagePaddingPx: 8,
  controlHeightPx: 36,
  sidebarWidthPx: 240,
} as const;

export const comfortable = {
  fontScale: 1,
  spacingScale: 0.94,
  cardPaddingPx: 16,
  pagePaddingPx: 12,
  controlHeightPx: 40,
  sidebarWidthPx: 240,
} as const;

export const spacious = {
  fontScale: 1.06,
  spacingScale: 1,
  cardPaddingPx: 18,
  pagePaddingPx: 8,
  controlHeightPx: 44,
  sidebarWidthPx: 260,
} as const;

export const displayDensities = {
  compact,
  comfortable,
  spacious,
} as const;

export const defaultDisplayDensity: DisplayDensity = "spacious";

export function isDisplayDensity(value: unknown): value is DisplayDensity {
  return (
    value === "compact" ||
    value === "comfortable" ||
    value === "spacious"
  );
}
