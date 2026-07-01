"use client";

import type { BookingListRow, BookingStatus } from "@/components/bookings/types";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { eachBookingYmdInRange } from "@/lib/booking-period";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCalendarWeekdays } from "@/hooks/use-calendar-weekdays";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

const CALENDAR_MIN_YEAR = 2020;

const calendarSelectTriggerClass = cn(
  "h-11 min-h-11 w-fit min-w-0 shrink-0 rounded-md border-2 border-rn-border-strong bg-background px-3 font-heading text-app-sm font-semibold shadow-none sm:h-12 sm:min-h-12 sm:text-app-base",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-rn-accent-border",
);

const calendarNavButtonClass =
  "h-11 rounded-md border-2 border-rn-border-strong px-4 text-app-sm font-semibold sm:h-12 sm:text-app-base";

const calendarNavIconButtonClass =
  "size-11 rounded-md border-2 border-rn-border-strong bg-background sm:size-12";

export type BookingsMonthCalendarNavigation = {
  cursor: Date;
  setCursor: (date: Date) => void;
  year: number;
  monthIndex: number;
  monthNames: string[];
  monthSelectLabel: string;
  yearOptions: number[];
  goToday: () => void;
  prevMonth: () => void;
  nextMonth: () => void;
  prevYear: () => void;
  nextYear: () => void;
  onMonthSelect: (value: string | null) => void;
  onYearSelect: (value: string | null) => void;
};

export function useBookingsMonthCalendarNavigation(
  rows: BookingListRow[],
): BookingsMonthCalendarNavigation {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("nb-NO", {
        month: "long",
        year: "numeric",
      }).format(cursor),
    [cursor],
  );

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("nb-NO", { month: "long" });
    return Array.from({ length: 12 }, (_, i) =>
      fmt.format(new Date(2020, i, 1)),
    );
  }, []);

  const monthSelectLabel = monthNames[monthIndex] ?? monthLabel;

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    let min = now;
    let max = now;
    for (const r of rows) {
      for (const iso of [r.eventDateIso, r.eventEndDateIso]) {
        if (!iso) continue;
        const y = Number.parseInt(iso.slice(0, 4), 10);
        if (!Number.isFinite(y)) continue;
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
    }
    min = Math.min(min, CALENDAR_MIN_YEAR, year);
    max = Math.max(max, now + 2, year);
    const list: number[] = [];
    for (let y = max; y >= min; y--) {
      list.push(y);
    }
    return list;
  }, [rows, year]);

  function prevMonth() {
    setCursor(new Date(year, monthIndex - 1, 1));
  }

  function nextMonth() {
    setCursor(new Date(year, monthIndex + 1, 1));
  }

  function prevYear() {
    setCursor(new Date(year - 1, monthIndex, 1));
  }

  function nextYear() {
    setCursor(new Date(year + 1, monthIndex, 1));
  }

  function goToday() {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function onMonthSelect(value: string | null) {
    if (value == null) return;
    const m = Number.parseInt(value, 10) - 1;
    if (m < 0 || m > 11) return;
    setCursor(new Date(year, m, 1));
  }

  function onYearSelect(value: string | null) {
    if (value == null) return;
    const y = Number.parseInt(value, 10);
    if (!Number.isFinite(y)) return;
    setCursor(new Date(y, monthIndex, 1));
  }

  return {
    cursor,
    setCursor,
    year,
    monthIndex,
    monthNames,
    monthSelectLabel,
    yearOptions,
    goToday,
    prevMonth,
    nextMonth,
    prevYear,
    nextYear,
    onMonthSelect,
    onYearSelect,
  };
}

export function BookingsMonthCalendarToolbar({
  monthIndex,
  monthNames,
  monthSelectLabel,
  year,
  yearOptions,
  goToday,
  prevMonth,
  nextMonth,
  prevYear,
  nextYear,
  onMonthSelect,
  onYearSelect,
}: BookingsMonthCalendarNavigation) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-wrap items-end justify-end gap-2"
      role="toolbar"
      aria-label={t("calendar.navAria")}
    >
      <Select value={String(monthIndex + 1)} onValueChange={onMonthSelect}>
        <SelectTrigger
          aria-label={t("calendar.selectMonth")}
          size="default"
          className={cn(
            calendarSelectTriggerClass,
            "min-w-[7.5rem] capitalize md:min-w-[8.5rem]",
          )}
        >
          <SelectValue>{monthSelectLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          alignItemWithTrigger={false}
          className="min-w-[var(--anchor-width)] rounded-md border-2 border-rn-border-strong"
        >
          {monthNames.map((name, i) => (
            <SelectItem
              key={i + 1}
              value={String(i + 1)}
              className="py-2.5 font-heading font-semibold capitalize"
            >
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(year)} onValueChange={onYearSelect}>
        <SelectTrigger
          aria-label={t("calendar.selectYear")}
          size="default"
          className={cn(calendarSelectTriggerClass, "tabular-nums")}
        >
          <SelectValue>{year}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="end"
          alignItemWithTrigger={false}
          className="min-w-[var(--anchor-width)] max-h-72 rounded-md border-2 border-rn-border-strong"
        >
          {yearOptions.map((y) => (
            <SelectItem
              key={y}
              value={String(y)}
              className="py-2.5 font-heading font-semibold tabular-nums"
            >
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        className={calendarNavButtonClass}
        onClick={goToday}
      >
        {t("bookings.today")}
      </Button>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={calendarNavIconButtonClass}
          onClick={prevYear}
          aria-label={t("calendar.prevYear")}
        >
          <ChevronsLeft className="size-[18px]" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={calendarNavIconButtonClass}
          onClick={prevMonth}
          aria-label={t("calendar.prevMonth")}
        >
          <ChevronLeft className="size-[18px]" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={calendarNavIconButtonClass}
          onClick={nextMonth}
          aria-label={t("calendar.nextMonth")}
        >
          <ChevronRight className="size-[18px]" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={calendarNavIconButtonClass}
          onClick={nextYear}
          aria-label={t("calendar.nextYear")}
        >
          <ChevronsRight className="size-[18px]" />
        </Button>
      </div>
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function BookingCalendarHoverPreview({
  row,
  hideFooter,
}: {
  row: BookingListRow;
  hideFooter?: boolean;
}) {
  const { t, formatCurrency } = useTranslation();
  return (
    <div className="space-y-2 text-left">
      <div>
        <p className="font-heading text-app-sm font-bold text-rn-text-heading md:text-app-base">
          {row.customer}
        </p>
        <p className="mt-0.5 text-app-xs text-muted-foreground tabular-nums md:text-app-sm">
          {row.date}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={row.status} />
      </div>
      <div className="space-y-1 border-t border-border pt-2 text-app-xs md:text-app-sm">
        <p>
          <span className="font-semibold text-rn-text-body">{t("bookings.eventLabel")}</span>{" "}
          <span className="text-foreground">{row.eventType}</span>
          {row.festType?.trim() ? (
            <>
              {" "}
              · <span className="font-medium">{row.festType.trim()}</span>
            </>
          ) : null}
        </p>
        <p className="flex items-center gap-1.5">
          <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-semibold text-rn-text-body">{t("bookings.guestsLabel")}</span>{" "}
            {row.guests}
          </span>
        </p>
        <p>
          <span className="font-semibold text-rn-text-body">{t("bookings.amount")}</span>{" "}
          <span className="tabular-nums font-semibold text-foreground">
            {formatCurrency(row.totalNok)}
          </span>
          {row.paidLabel ? (
            <span className="text-muted-foreground">
              {" "}
              · {row.paidLabel}
            </span>
          ) : null}
        </p>
      </div>
      {hideFooter ? null : (
        <p className="text-[10px] leading-snug text-muted-foreground md:text-app-xs">
          {t("bookings.clickForDetails")}
        </p>
      )}
    </div>
  );
}

function DayBookingsHoverPopupContent({ bookings }: { bookings: BookingListRow[] }) {
  const { t } = useTranslation();
  if (bookings.length === 0) return null;
  if (bookings.length === 1) {
    return <BookingCalendarHoverPreview row={bookings[0]} />;
  }
  return (
    <div className="max-h-[min(70vh,22rem)] space-y-0 overflow-y-auto text-left">
      <p className="mb-2 text-app-xs font-semibold text-muted-foreground">
        {t("bookings.bookingsThisDay", { count: bookings.length })}
      </p>
      {bookings.map((row, i) => (
        <div
          key={row.id}
          className={cn(i > 0 && "mt-3 border-t border-border pt-3")}
        >
          <BookingCalendarHoverPreview row={row} hideFooter />
        </div>
      ))}
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground md:text-app-xs">
        {t("bookings.clickBookingForDetails")}
      </p>
    </div>
  );
}

/** Bakgrunn for hele dagen — samme prioritering som statusfarger (pending synlig). */
function dayCellFillClass(bookings: BookingListRow[]): string {
  if (bookings.length === 0) return "";
  const active = bookings.filter((b) => b.status !== "cancelled");
  if (active.length === 0) {
    return "bg-rose-100/85 ring-1 ring-inset ring-rose-300/40 dark:bg-rose-950/30 dark:ring-rose-700/40";
  }
  if (active.some((b) => b.status === "pending")) {
    return "bg-amber-100/85 ring-1 ring-inset ring-amber-400/35 dark:bg-amber-950/30 dark:ring-amber-600/40";
  }
  return "bg-emerald-100/85 ring-1 ring-inset ring-emerald-400/35 dark:bg-emerald-950/25 dark:ring-emerald-700/35";
}

function bookingRowButtonClass(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "text-emerald-950 hover:bg-card/60 focus-visible:ring-emerald-600/50 dark:text-emerald-100";
    case "pending":
      return "text-amber-950 hover:bg-card/60 focus-visible:ring-amber-600/50 dark:text-amber-100";
    case "cancelled":
      return "text-rose-900/90 line-through decoration-rose-700/70 hover:bg-card/50 focus-visible:ring-rose-500/40 dark:text-rose-200";
    default:
      return "text-foreground hover:bg-card/50";
  }
}

export function BookingsMonthCalendar({
  rows,
  totalBookingsCount,
  onSelectBooking,
  navigation,
  hideToolbar = false,
}: {
  rows: BookingListRow[];
  /** Alle bookinger (ufiltrert), for tom tilstandstekst. */
  totalBookingsCount: number;
  onSelectBooking: (id: string) => void;
  navigation?: BookingsMonthCalendarNavigation;
  hideToolbar?: boolean;
}) {
  if (navigation) {
    return (
      <BookingsMonthCalendarView
        rows={rows}
        totalBookingsCount={totalBookingsCount}
        onSelectBooking={onSelectBooking}
        navigation={navigation}
        hideToolbar={hideToolbar}
      />
    );
  }

  return <BookingsMonthCalendarWithNavigation {...{ rows, totalBookingsCount, onSelectBooking, hideToolbar }} />;
}

function BookingsMonthCalendarWithNavigation(
  props: Omit<Parameters<typeof BookingsMonthCalendarView>[0], "navigation">,
) {
  const navigation = useBookingsMonthCalendarNavigation(props.rows);
  return <BookingsMonthCalendarView {...props} navigation={navigation} />;
}

function BookingsMonthCalendarView({
  rows,
  totalBookingsCount,
  onSelectBooking,
  navigation,
  hideToolbar = false,
}: {
  rows: BookingListRow[];
  totalBookingsCount: number;
  onSelectBooking: (id: string) => void;
  navigation: BookingsMonthCalendarNavigation;
  hideToolbar?: boolean;
}) {
  const { t, formatCurrency, locale } = useTranslation();
  const weekdays = useCalendarWeekdays();
  const { year, monthIndex } = navigation;

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "nb" ? "nb-NO" : "en-GB", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, monthIndex, 1)),
    [year, monthIndex, locale],
  );

  const rowsInMonth = useMemo(() => {
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    return rows.filter((r) => {
      for (const ymd of eachBookingYmdInRange(
        r.eventDateIso,
        r.eventEndDateIso,
      )) {
        if (ymd.startsWith(prefix)) return true;
      }
      return false;
    });
  }, [rows, year, monthIndex]);

  const byDay = useMemo(() => {
    const m = new Map<string, BookingListRow[]>();
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    for (const r of rowsInMonth) {
      for (const d of eachBookingYmdInRange(
        r.eventDateIso,
        r.eventEndDateIso,
      )) {
        if (!d.startsWith(prefix)) continue;
        const list = m.get(d) ?? [];
        list.push(r);
        m.set(d, list);
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.customer.localeCompare(b.customer, "nb"));
    }
    return m;
  }, [rowsInMonth, year, monthIndex]);

  const { daysInMonth, startPad, todayYmd } = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const dim = new Date(year, monthIndex + 1, 0).getDate();
    const start = (first.getDay() + 6) % 7;
    const t = new Date();
    const ty = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    return { daysInMonth: dim, startPad: start, todayYmd: ty };
  }, [year, monthIndex]);

  const filteredCount = rows.length;

  const emptyMonthMessage =
    rowsInMonth.length === 0
      ? totalBookingsCount === 0
        ? t("bookings.noBookingsYet")
        : filteredCount === 0
          ? t("bookings.noSearchResults")
          : t("bookings.noBookingsThisMonth")
      : null;

  const headerCells = weekdays.map((wd) => (
    <div
      key={wd}
      className="bg-rn-surface-table-head px-1 py-2 text-center text-[10px] font-bold tracking-wider text-rn-text-column uppercase sm:px-2 md:text-app-xs"
    >
      {wd}
    </div>
  ));

  const dayCells: ReactNode[] = [];

  for (let i = 0; i < startPad; i++) {
    dayCells.push(
      <div
        key={`pad-${i}`}
        className="min-h-[5.5rem] bg-rn-surface-segment/35 sm:min-h-[6.5rem] md:min-h-[7.5rem]"
      />,
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
    const dayBookings = byDay.get(ymd) ?? [];
    const isToday = ymd === todayYmd;

    const hasBookings = dayBookings.length > 0;

    const cellClass = cn(
      "flex min-h-[5.5rem] flex-col gap-1 p-1 sm:min-h-[6.5rem] md:min-h-[7.5rem] md:p-1.5",
      hasBookings ? dayCellFillClass(dayBookings) : "bg-card",
      isToday &&
        cn("ring-2 ring-inset ring-success", !hasBookings && "bg-success/5"),
    );

    const dayInner = (
      <>
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-app-xs font-bold sm:size-7 sm:text-app-sm md:size-8 md:text-app-base",
            isToday
              ? "bg-success !text-white shadow-sm [&_svg]:!text-white"
              : hasBookings
                ? "bg-card/80 text-rn-text-heading shadow-sm backdrop-blur-[2px]"
                : "text-rn-text-heading",
          )}
        >
          {day}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md [-webkit-overflow-scrolling:touch]",
            hasBookings && "min-h-[2.25rem] px-0.5 py-0.5",
          )}
        >
          {dayBookings.map((b) => (
            <button
              key={b.id}
              type="button"
              className={cn(
                "w-full rounded-md px-1 py-0.5 text-left text-[10px] font-semibold leading-tight transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 sm:text-[11px] md:px-1.5 md:py-1 md:text-app-xs",
                bookingRowButtonClass(b.status),
                b.dimmed && "opacity-60",
              )}
              onClick={() => onSelectBooking(b.id)}
              aria-label={`${b.customer}, ${b.date}${b.festType?.trim() ? `, ${b.festType.trim()}` : ""}`}
            >
              <span className="line-clamp-2">{b.customer}</span>
            </button>
          ))}
        </div>
      </>
    );

    dayCells.push(
      hasBookings ? (
        <PopoverPrimitive.Root key={ymd} modal={false}>
          <PopoverPrimitive.Trigger
            openOnHover
            delay={180}
            closeDelay={220}
            nativeButton={false}
            aria-label={
              dayBookings.length === 1
                ? t("bookings.dayBookingsAria", { count: dayBookings.length, day })
                : t("bookings.dayBookingsAriaPlural", { count: dayBookings.length, day })
            }
            render={(props) => (
              <div
                {...props}
                className={cn(
                  props.className,
                  cellClass,
                  "cursor-default text-left outline-none focus-visible:ring-2 focus-visible:ring-success/40 focus-visible:ring-offset-0",
                )}
              >
                {dayInner}
              </div>
            )}
          />
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Positioner
              className="isolate z-80 outline-none"
              positionMethod="fixed"
              side="top"
              align="center"
              sideOffset={10}
              collisionAvoidance={{
                side: "shift",
                align: "shift",
                fallbackAxisSide: "none",
              }}
            >
              <PopoverPrimitive.Popup
                initialFocus={(openType) => openType === "keyboard"}
                className={cn(
                  "max-w-[min(20rem,calc(100vw-1.5rem))] origin-(--transform-origin) rounded-md border-2 border-rn-border-strong bg-popover p-3 text-popover-foreground shadow-rn-card outline-none",
                  "pointer-events-none select-none",
                  "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                )}
              >
                <DayBookingsHoverPopupContent bookings={dayBookings} />
              </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      ) : (
        <div key={ymd} className={cellClass}>
          {dayInner}
        </div>
      ),
    );
  }

  const tail = dayCells.length % 7;
  if (tail !== 0) {
    for (let i = 0; i < 7 - tail; i++) {
      dayCells.push(
        <div
          key={`trail-${i}`}
          className="min-h-[5.5rem] bg-rn-surface-segment/35 sm:min-h-[6.5rem] md:min-h-[7.5rem]"
        />,
      );
    }
  }

  return (
    <div className="border-t border-rn-border-strong/35 px-6 py-5 md:px-8 md:py-6">
      {!hideToolbar ? (
        <div className="mb-4 flex justify-end">
          <BookingsMonthCalendarToolbar {...navigation} />
        </div>
      ) : null}

      <div className="overflow-x-auto pb-1">
        <div
          className="min-w-[280px] overflow-hidden rounded-md border-2 border-rn-border-strong bg-border/80 shadow-sm"
          aria-label={t("calendar.bookingsMonthAria", { month: monthLabel })}
        >
          <div className="grid grid-cols-7 gap-px">
            {headerCells}
            {dayCells}
          </div>
        </div>
      </div>

      {emptyMonthMessage ? (
        <p className="mt-5 text-center text-app-base text-muted-foreground">
          {emptyMonthMessage}
        </p>
      ) : null}
    </div>
  );
}
