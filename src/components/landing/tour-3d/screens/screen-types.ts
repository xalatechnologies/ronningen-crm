import type { ScreenTheme } from "@/components/landing/tour-3d/screen-palette";
import type { Locale } from "@/i18n/config";
import { formatCurrency, formatDate } from "@/i18n/formatters";
import type { Dictionary } from "@/i18n/types";

export type TourCopy = Dictionary["landing"]["tour3d"];
export type TourScreensCopy = TourCopy["screens"];
export type StatusKey = keyof TourScreensCopy["status"];
export type EventKey = keyof TourScreensCopy["events"];
export type Tone = "success" | "warning" | "danger" | "info";

export type DateStyle = "short" | "dayMonth" | "long" | "monthYear" | "monthShort";

export type ScreenFormat = {
  money: (amount: number) => string;
  date: (date: Date, style: DateStyle) => string;
};

export type DrawEnv = { theme: ScreenTheme; copy: TourScreensCopy; format: ScreenFormat };

/** Draws one app screen at a given animation progress (0 = before its moment, 1 = finished). */
export type ScreenDrawer = (ctx: CanvasRenderingContext2D, progress: number, env: DrawEnv) => void;

/** The shared formatDate defaults to day + short month + year; each style sets exactly the parts it shows. */
const STYLE_RESET: Intl.DateTimeFormatOptions = { day: undefined, month: undefined, year: undefined };

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: "numeric", month: "short", year: "numeric" },
  dayMonth: { day: "numeric", month: "short" },
  long: { day: "numeric", month: "long", year: "numeric" },
  monthYear: { month: "long", year: "numeric" },
  monthShort: { month: "short" },
};

/** Money and dates through the app's shared formatters. Sample dates are UTC noon, so they never shift a day. */
export function createScreenFormat(locale: Locale): ScreenFormat {
  return {
    money: (amount) => formatCurrency(locale, Math.round(amount)),
    date: (date, style) => {
      // Norwegian short months end with a period ("des."); the app shows them without it.
      const text = formatDate(locale, date, { ...STYLE_RESET, ...DATE_OPTIONS[style], timeZone: "UTC" }).replace(
        /(\p{L})\./gu,
        "$1",
      );
      return style === "monthYear" ? text.charAt(0).toUpperCase() + text.slice(1) : text;
    },
  };
}
