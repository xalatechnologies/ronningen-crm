"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/client";
import {
  buildReportsYearOptions,
  REPORTS_ALL_YEARS_PARAM,
} from "@/lib/reports/calendar-range";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/** Intern Select-verdi for «hele året» — ikke et tall, så trigger viser etikett. */
const MONTH_ALL = "alle";

const selectTriggerBaseClass = cn(
  "reports-filter-trigger rounded-md border-2 border-rn-border-strong bg-rn-surface-segment px-3 font-heading font-semibold leading-snug shadow-rn-segment-inset sm:px-4 md:px-5",
  "data-[size=default]:h-12 data-[size=default]:min-h-12 md:data-[size=default]:h-14 md:data-[size=default]:min-h-14 md:py-3.5",
  "focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 data-popup-open:border-rn-accent-border",
  "[&_svg:not([class*='size-'])]:size-5",
);

const yearSelectTriggerClass = cn(
  selectTriggerBaseClass,
  "w-fit min-w-0 shrink-0 px-3 md:px-4",
);

const monthSelectTriggerClass = cn(
  selectTriggerBaseClass,
  "w-fit min-w-0 shrink-0 px-3 capitalize md:px-4",
);

const filterButtonClass = cn(
  selectTriggerBaseClass,
  "w-fit min-w-0 shrink-0 px-3 md:px-4",
  "transition-colors",
);

function formatMonthTriggerLabel(
  monthValue: string,
  monthNames: string[],
  wholeYearLabel: string,
): string {
  if (monthValue === MONTH_ALL) return wholeYearLabel;
  const idx = Number.parseInt(monthValue, 10) - 1;
  const name = monthNames[idx];
  if (!name) return monthValue;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function ReportsYearMonthCalendar({
  reportYear,
  currentCalendarYear,
  calendarYearMin,
  calendarYearMax,
  allYears,
}: {
  reportYear: number;
  currentCalendarYear: number;
  calendarYearMin: number;
  calendarYearMax: number;
  allYears: boolean;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthNames = useMemo(() => {
    const intlLocale = locale === "nb" ? "nb-NO" : "en-GB";
    const fmt = new Intl.DateTimeFormat(intlLocale, { month: "long" });
    return Array.from({ length: 12 }, (_, i) =>
      fmt.format(new Date(2020, i, 1)),
    );
  }, [locale]);

  const yearOptions = useMemo(
    () => buildReportsYearOptions(calendarYearMin, calendarYearMax),
    [calendarYearMin, calendarYearMax],
  );

  const monthParam = searchParams.get("month");
  const parsedM = Number.parseInt(monthParam ?? "", 10);
  const monthSelectValue =
    Number.isFinite(parsedM) && parsedM >= 1 && parsedM <= 12
      ? String(parsedM)
      : MONTH_ALL;

  const hasActiveFilters =
    allYears || searchParams.has("year") || searchParams.has("month");

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const q = next.toString();
      const href = q ? `${pathname}?${q}` : pathname;
      router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const onAllYearsClick = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("year", REPORTS_ALL_YEARS_PARAM);
    next.delete("month");
    pushParams(next);
  }, [pushParams, searchParams]);

  const onYearChange = useCallback(
    (value: string | null) => {
      if (value == null) return;
      const y = Number(value);
      const next = new URLSearchParams(searchParams.toString());
      if (y === currentCalendarYear) next.delete("year");
      else next.set("year", String(y));
      pushParams(next);
    },
    [currentCalendarYear, pushParams, searchParams],
  );

  const onMonthChange = useCallback(
    (value: string | null) => {
      if (value == null || allYears) return;
      const next = new URLSearchParams(searchParams.toString());
      if (value === MONTH_ALL) {
        next.delete("month");
      } else {
        next.set("month", value);
      }
      pushParams(next);
    },
    [allYears, pushParams, searchParams],
  );

  const onReset = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const wholeYearLabel = t("calendar.wholeYear");
  const allYearsLabel = t("reports.allYears");

  const monthTriggerLabel = useMemo(
    () => formatMonthTriggerLabel(monthSelectValue, monthNames, wholeYearLabel),
    [monthSelectValue, monthNames, wholeYearLabel],
  );

  const yearTriggerLabel = allYears ? allYearsLabel : String(reportYear);
  const yearSelectValue = allYears
    ? REPORTS_ALL_YEARS_PARAM
    : String(reportYear);

  return (
    <div
      className="flex w-full flex-row flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:shrink-0 md:gap-3"
      data-reports-period-controls
    >
      <button
        type="button"
        aria-label={t("reports.allYearsAria")}
        aria-pressed={allYears}
        onClick={onAllYearsClick}
        className={cn(
          filterButtonClass,
          allYears &&
            "border-success bg-success/10 text-success shadow-none ring-2 ring-success/25",
        )}
      >
        {allYearsLabel}
      </button>

      <Select value={yearSelectValue} onValueChange={onYearChange}>
        <SelectTrigger
          aria-label={t("calendar.selectYearReport")}
          size="default"
          className={cn(
            yearSelectTriggerClass,
            "tabular-nums",
            allYears && "text-success",
          )}
        >
          <SelectValue>{yearTriggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="max-h-72 min-w-[var(--anchor-width)] rounded-md border-2 border-rn-border-strong"
        >
          {yearOptions.map((year) => (
            <SelectItem
              key={year}
              value={String(year)}
              className="reports-filter-item py-2.5 font-heading font-semibold tabular-nums"
            >
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={monthSelectValue}
        onValueChange={onMonthChange}
        disabled={allYears}
      >
        <SelectTrigger
          aria-label={t("calendar.selectMonthReport")}
          aria-disabled={allYears}
          size="default"
          className={cn(
            monthSelectTriggerClass,
            allYears && "pointer-events-none opacity-50",
          )}
        >
          <SelectValue>{monthTriggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="min-w-[var(--anchor-width)] max-h-72 rounded-md border-2 border-rn-border-strong"
        >
          <SelectItem
            value={MONTH_ALL}
            className="reports-filter-item py-2.5 font-heading font-semibold"
          >
            {wholeYearLabel}
          </SelectItem>
          {monthNames.map((name, i) => (
            <SelectItem
              key={i + 1}
              value={String(i + 1)}
              className="py-2.5 font-heading reports-filter-item font-semibold capitalize"
            >
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        aria-label={t("reports.resetPeriodAria")}
        onClick={onReset}
        disabled={!hasActiveFilters}
        className={cn(
          filterButtonClass,
          !hasActiveFilters && "cursor-not-allowed opacity-45",
        )}
      >
        {t("reports.resetPeriod")}
      </button>
    </div>
  );
}
