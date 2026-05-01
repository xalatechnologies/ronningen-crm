"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { REPORTS_CALENDAR_MIN_YEAR } from "./types";

/** Intern Select-verdi for «hele året» — ikke et tall, så trigger viser etikett. */
const MONTH_ALL = "alle";

const selectTriggerBaseClass = cn(
  "data-[size=default]:h-[3.375rem] data-[size=default]:min-h-[3.375rem] md:data-[size=default]:h-[3.625rem] md:data-[size=default]:min-h-[3.625rem]",
  "rounded-md border-2 border-rn-border-strong bg-background py-2 font-heading text-lg font-semibold leading-snug shadow-sm md:text-xl",
  "focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25 focus-visible:ring-offset-0 data-popup-open:border-rn-accent-border",
  "[&_svg]:size-4 md:[&_svg]:size-5",
);

const yearSelectTriggerClass = cn(
  selectTriggerBaseClass,
  "w-fit min-w-0 shrink-0 px-3 md:px-4",
);

const monthSelectTriggerClass = cn(
  selectTriggerBaseClass,
  "w-fit min-w-0 shrink-0 px-3 capitalize md:px-4",
);

function formatMonthTriggerLabel(
  monthValue: string,
  monthNames: string[],
): string {
  if (monthValue === MONTH_ALL) return "Hele året";
  const idx = Number.parseInt(monthValue, 10) - 1;
  const name = monthNames[idx];
  if (!name) return monthValue;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function ReportsYearMonthCalendar({
  reportYear,
  calendarYearMax,
}: {
  reportYear: number;
  calendarYearMax: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("nb-NO", { month: "long" });
    return Array.from({ length: 12 }, (_, i) =>
      fmt.format(new Date(2020, i, 1)),
    );
  }, []);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = calendarYearMax; y >= REPORTS_CALENDAR_MIN_YEAR; y--) {
      list.push(y);
    }
    return list;
  }, [calendarYearMax]);

  const monthParam = searchParams.get("month");
  const parsedM = Number.parseInt(monthParam ?? "", 10);
  const monthSelectValue =
    Number.isFinite(parsedM) && parsedM >= 1 && parsedM <= 12
      ? String(parsedM)
      : MONTH_ALL;

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const q = next.toString();
      const href = q ? `${pathname}?${q}` : pathname;
      router.push(href, { scroll: false });
      router.refresh();
    },
    [pathname, router],
  );

  const onYearChange = useCallback(
    (value: string | null) => {
      if (value == null) return;
      const y = Number(value);
      const next = new URLSearchParams(searchParams.toString());
      if (y === calendarYearMax) next.delete("year");
      else next.set("year", String(y));
      pushParams(next);
    },
    [calendarYearMax, pushParams, searchParams],
  );

  const onMonthChange = useCallback(
    (value: string | null) => {
      if (value == null) return;
      const next = new URLSearchParams(searchParams.toString());
      if (value === MONTH_ALL) {
        next.delete("month");
      } else {
        next.set("month", value);
      }
      pushParams(next);
    },
    [pushParams, searchParams],
  );

  const monthTriggerLabel = useMemo(
    () => formatMonthTriggerLabel(monthSelectValue, monthNames),
    [monthSelectValue, monthNames],
  );

  return (
    <div className="flex w-full flex-row flex-wrap items-center justify-end gap-2 py-0.5 sm:ml-auto sm:w-auto sm:shrink-0 sm:py-1 md:gap-3">
      <Select value={String(reportYear)} onValueChange={onYearChange}>
        <SelectTrigger
          aria-label="Velg år for rapport"
          size="default"
          className={cn(yearSelectTriggerClass, "tabular-nums")}
        >
          <SelectValue>{reportYear}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="min-w-[var(--anchor-width)] rounded-md border-2 border-rn-border-strong"
        >
          {yearOptions.map((y) => (
            <SelectItem
              key={y}
              value={String(y)}
              className="py-2.5 font-heading text-lg font-semibold tabular-nums md:py-3 md:text-xl"
            >
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={monthSelectValue} onValueChange={onMonthChange}>
        <SelectTrigger
          aria-label="Velg måned for rapport"
          size="default"
          className={monthSelectTriggerClass}
        >
          <SelectValue>{monthTriggerLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="min-w-[var(--anchor-width)] max-h-72 rounded-md border-2 border-rn-border-strong"
        >
          <SelectItem
            value={MONTH_ALL}
            className="py-2.5 font-heading text-lg font-semibold md:py-3 md:text-xl"
          >
            Hele året
          </SelectItem>
          {monthNames.map((name, i) => (
            <SelectItem
              key={i + 1}
              value={String(i + 1)}
              className="py-2.5 font-heading text-lg font-semibold capitalize md:py-3 md:text-xl"
            >
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
