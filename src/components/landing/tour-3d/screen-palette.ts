/**
 * Colours and fonts for the screens drawn on canvas. Every colour comes from a design token
 * (src/styles/tokens.css, src/styles/wedding-portal.css), read at runtime, so the tour follows the real app.
 */

export const STAFF_TOKENS = {
  canvas: "--background",
  card: "--card",
  border: "--rn-border",
  frame: "--rn-badge-border",
  faint: "--rn-border-strong",
  ink: "--rn-text-heading",
  muted: "--rn-text-muted",
  brand: "--rn-primary",
  brandSoft: "--rn-primary-soft",
  onBrand: "--primary-foreground",
  sidebar: "--sidebar",
  sidebarActive: "--sidebar-accent",
  sidebarText: "--sidebar-foreground",
  sidebarRing: "--sidebar-ring",
  segment: "--rn-surface-segment",
  tableHead: "--rn-surface-table-head",
  wash: "--rn-surface-wash",
  successBg: "--status-success-bg",
  successText: "--status-success-text",
  warningBg: "--status-warning-bg",
  warningText: "--status-warning-text",
  dangerBg: "--status-danger-bg",
  dangerText: "--status-danger-text",
  infoBg: "--status-info-bg",
  infoText: "--status-info-text",
} as const;

/** Read inside `.wedding-portal`, where these tokens hold the wedding palette. */
export const PORTAL_TOKENS = {
  bg: "--rn-background-main",
  card: "--rn-card",
  primary: "--rn-primary",
  soft: "--rn-primary-soft",
  heading: "--rn-text-heading",
  ink: "--rn-text-ink",
  muted: "--rn-text-muted",
  border: "--rn-border",
  gold: "--rn-gold",
  successBg: "--status-success-bg",
  successText: "--status-success-text",
} as const;

export type StaffPalette = Record<keyof typeof STAFF_TOKENS, string>;
export type PortalPalette = Record<keyof typeof PORTAL_TOKENS, string>;
export type ScreenFonts = { sans: string; serif: string };
export type ScreenTheme = { staff: StaffPalette; portal: PortalPalette; fonts: ScreenFonts };

export function resolveTokens<T extends Record<string, string>>(
  tokens: T,
  read: (name: string) => string,
): Record<keyof T, string> {
  const out = {} as Record<keyof T, string>;
  for (const key of Object.keys(tokens) as (keyof T)[]) {
    out[key] = read(tokens[key]!).trim();
  }
  return out;
}

/** A token colour with transparency, for canvas and WebGL, which have no `color-mix`. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace("#", "");
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Reads the light app theme and the wedding portal theme from a hidden probe element,
 * plus the font families next/font registered for the page.
 */
export function readScreenTheme(doc: Document): ScreenTheme {
  const probe = doc.createElement("div");
  probe.setAttribute("data-theme", "light");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
  const portalProbe = doc.createElement("div");
  portalProbe.className = "wedding-portal";
  probe.appendChild(portalProbe);
  doc.body.appendChild(probe);
  try {
    const staffStyle = getComputedStyle(probe);
    const portalStyle = getComputedStyle(portalProbe);
    const sans = getComputedStyle(doc.body).fontFamily || "system-ui, sans-serif";
    const serif = portalStyle.getPropertyValue("--font-serif").trim() || "Georgia, serif";
    return {
      staff: resolveTokens(STAFF_TOKENS, (name) => staffStyle.getPropertyValue(name)),
      portal: resolveTokens(PORTAL_TOKENS, (name) => portalStyle.getPropertyValue(name)),
      fonts: { sans, serif },
    };
  } finally {
    probe.remove();
  }
}
