/**
 * Shared list/table cell typography for tenant app data views.
 * Hierarchy: primary (names) → dates/amounts (semibold) → body (medium) → muted (captions).
 */

export const APP_TABLE_CELL_PAD = "px-6 py-5 sm:px-8 sm:py-6";

export const APP_TABLE_HEAD =
  "py-4 font-semibold tracking-wider text-rn-text-column uppercase sm:py-5";

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
