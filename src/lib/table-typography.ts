/**
 * Shared list/table cell typography for tenant app data views.
 * Hierarchy: primary (names) → dates/amounts (semibold) → body (medium) → muted (captions).
 */

export const APP_TABLE_CELL_PAD = "px-6 py-5 sm:px-8 sm:py-6";

/** Thin column-header stripe (same height on Reservasjoner, Forespørsler, and all lists). */
export const APP_TABLE_HEAD_BAR =
  "items-center border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head px-6 py-2.5 sm:px-8";

export const APP_TABLE_HEAD =
  "whitespace-nowrap py-2.5 font-semibold tracking-wider text-rn-text-column uppercase";

export const APP_TABLE_HEAD_CELL = `${APP_TABLE_HEAD} px-6 md:px-8`;

export const APP_TABLE_HEAD_CELL_ADMIN =
  `${APP_TABLE_HEAD} px-4 text-left text-app-sm sm:px-6 sm:text-app-base md:px-8`;

/** Typography tokens — combine with workspace-specific padding when needed. */
export const APP_DATA_PRIMARY = "font-heading font-semibold text-foreground";

export const APP_DATA_BODY = "font-medium text-foreground";

export const APP_DATA_DATE =
  "app-data-row-date font-semibold tabular-nums text-foreground";

export const APP_DATA_AMOUNT = "font-semibold tabular-nums text-foreground";

export const APP_DATA_MUTED = "text-muted-foreground";

/** Dates inside card-style list rows (e.g. Reservasjoner). */
export const APP_LIST_ROW_DATE = APP_DATA_DATE;

export const APP_TABLE_CELL =
  `${APP_TABLE_CELL_PAD} align-middle whitespace-nowrap text-rn-text-body`;

export const APP_TABLE_CELL_PRIMARY = `${APP_TABLE_CELL} ${APP_DATA_PRIMARY}`;

export const APP_TABLE_CELL_BODY = `${APP_TABLE_CELL} ${APP_DATA_BODY}`;

export const APP_TABLE_CELL_DATE = `${APP_TABLE_CELL} ${APP_DATA_DATE}`;

export const APP_TABLE_CELL_AMOUNT = `${APP_TABLE_CELL} ${APP_DATA_AMOUNT}`;

export const APP_TABLE_CELL_MUTED = `${APP_TABLE_CELL} ${APP_DATA_MUTED}`;
