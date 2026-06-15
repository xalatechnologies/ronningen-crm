/**
 * Composed class strings for structured surfaces (tokens: src/styles/tokens.css,
 * Tailwind theme: src/app/globals.css).
 */
export const RN_CARD_SHELL =
  "rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card shadow-rn-card";

export const RN_SEGMENT_CONTROL =
  "inline-flex rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-rn-surface-segment p-1.5 shadow-rn-segment-inset";

/** Hovedmeny (sidebar + mobil) — skaleres via `.app-main-nav-link` i globals. */
export const RN_TEXT_NAV_LINK =
  "app-main-nav-link font-heading leading-snug";

/** Aktiv hovedmeny-lenke — grønn tekst i lys modus, hvit i mørk modus. */
export const RN_NAV_LINK_ACTIVE =
  "border-rn-accent-border bg-rn-surface-gradient-from font-semibold text-success shadow-sm dark:!text-white";

/** Aktiv hovedmeny-ikon — matcher RN_NAV_LINK_ACTIVE. */
export const RN_NAV_LINK_ACTIVE_ICON =
  "text-success opacity-100 dark:!text-white";

/** Admin-tabell primærlenke — grønn i lys modus, hvit i mørk modus. */
export const RN_ADMIN_DETAIL_LINK =
  "font-heading font-semibold text-success hover:underline dark:!text-white";

/** Admin segmentfilter — aktiv tilstand. */
export const RN_ADMIN_SEGMENT_ACTIVE =
  "border-2 border-rn-accent-border bg-rn-surface-gradient-from font-bold text-success shadow-sm dark:!text-white";

/** Segment-/filterknapper — samme grunnstørrelse som hovedmeny. */
export const RN_TEXT_SEGMENT =
  "app-main-nav-link font-heading font-semibold tracking-tight";

/** Søkefelt-rad (kunder/partnere m.fl.) — samme layout og bredde. */
export const RN_PAGE_SEARCH_TOOLBAR =
  "flex w-full min-w-0 flex-col gap-3 md:min-w-0 md:flex-1 md:flex-row md:items-stretch md:justify-end md:gap-3 lg:gap-4";

export const RN_PAGE_SEARCH_FIELD_WRAP =
  "relative min-w-0 w-full md:flex-1 md:max-w-3xl";

export const RN_PAGE_SEARCH_INPUT =
  "h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm dark:bg-background dark:text-foreground md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

/**
 * Native `<select>` — samme feltstil som øvrige skjema-/filterkontroller (border-2, success-fokus).
 * Brukes med `NativeSelect` (chevron + `pr-11`); legg f.eks. til `pl-11`/`pl-12` ved ledende ikon.
 */
export const RN_NATIVE_SELECT_CLASS =
  "box-border flex h-12 min-h-12 w-full min-w-0 cursor-pointer appearance-none rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 pr-11 text-base font-medium text-foreground shadow-sm outline-none transition-[color,box-shadow] focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

/** Chevron for `NativeSelect` — absolutt posisjon inne i `relative`-wrapper. */
export const RN_NATIVE_SELECT_CHEVRON_CLASS =
  "pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground";

/**
 * Base UI `SelectTrigger` — matchende feltstil (bruk `size="default"` + `className` for bredde/tema).
 */
export const RN_SELECT_TRIGGER_FIELD_CLASS =
  "box-border flex min-h-12 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-2 text-app-control font-medium shadow-sm outline-none transition-[color,box-shadow] select-none focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-popup-open:border-rn-accent-border disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 data-placeholder:text-muted-foreground";
