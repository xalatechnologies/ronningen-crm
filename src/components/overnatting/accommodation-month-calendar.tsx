"use client";

import type { AccommodationReservationRow } from "@/components/overnatting/types";
import { Button } from "@/components/ui/button";
import { useCalendarWeekdays } from "@/hooks/use-calendar-weekdays";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { formatAppDateFromParts } from "@/lib/format-datetime";
import { ymAdd } from "@/lib/overnatting-month";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { BedDouble, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { AccommodationReservationStatus } from "@/lib/validations";
import type { ReactNode } from "react";
import { useMemo } from "react";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Netter i halvåpent intervall [checkIn, checkOut) som yyyy-mm-dd */
function eachStayYmd(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn.slice(0, 10);
  const end = checkOut.slice(0, 10);
  while (cur < end) {
    out.push(cur);
    const d = new Date(`${cur}T12:00:00`);
    d.setDate(d.getDate() + 1);
    cur = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return out;
}

function dayCellFillClass(rows: AccommodationReservationRow[]): string {
  if (rows.length === 0) return "";
  const active = rows.filter((r) => r.status !== "cancelled");
  if (active.length === 0) {
    return "bg-rose-100/85 ring-1 ring-inset ring-rose-300/40 dark:bg-rose-950/30 dark:ring-rose-700/40";
  }
  if (active.some((r) => r.status === "tentative")) {
    return "bg-amber-100/85 ring-1 ring-inset ring-amber-400/35 dark:bg-amber-950/30 dark:ring-amber-600/40";
  }
  return "bg-emerald-100/85 ring-1 ring-inset ring-emerald-400/35 dark:bg-emerald-950/25 dark:ring-emerald-700/35";
}

function resRowButtonClass(status: AccommodationReservationStatus) {
  switch (status) {
    case "confirmed":
      return "text-emerald-950 hover:bg-card/60 focus-visible:ring-emerald-600/50 dark:text-emerald-100";
    case "tentative":
      return "text-amber-950 hover:bg-card/60 focus-visible:ring-amber-600/50 dark:text-amber-100";
    case "cancelled":
      return "text-rose-900/90 line-through decoration-rose-700/70 hover:bg-card/50 focus-visible:ring-rose-500/40 dark:text-rose-200";
    default:
      return "text-foreground hover:bg-card/50";
  }
}

function StayHoverPreview({
  row,
  hideFooter,
}: {
  row: AccommodationReservationRow;
  hideFooter?: boolean;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="space-y-2 text-left">
      <div>
        <p className="font-heading text-app-sm font-bold text-rn-text-heading md:text-app-base">
          {row.customerName}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-app-xs text-muted-foreground md:text-app-sm">
          <BedDouble className="size-3.5 shrink-0" aria-hidden />
          <span>{row.unitName}</span>
        </p>
      </div>
      <p className="text-app-xs font-medium text-foreground md:text-app-sm">
        {statusLabel(row.status, t)}
      </p>
      <div className="space-y-1 border-t border-border pt-2 text-app-xs md:text-app-sm">
        <p className="tabular-nums">
          <span className="font-semibold text-rn-text-body">
            {t("overnatting.calendar.period")}
          </span>{" "}
          {formatAppDateFromParts(row.checkInDate, row.checkInTime, locale)} →{" "}
          {formatAppDateFromParts(row.checkOutDate, row.checkOutTime, locale)}
        </p>
        <p>
          <span className="font-semibold text-rn-text-body">
            {t("overnatting.calendar.guests")}
          </span>{" "}
          {row.guestCount}
        </p>
      </div>
      {hideFooter ? null : (
        <p className="text-[10px] leading-snug text-muted-foreground md:text-app-xs">
          {t("overnatting.calendar.clickToEdit")}
        </p>
      )}
    </div>
  );
}

function DayStaysHoverContent({
  rows,
}: {
  rows: AccommodationReservationRow[];
}) {
  const { t } = useTranslation();

  if (rows.length === 0) return null;
  if (rows.length === 1) {
    return <StayHoverPreview row={rows[0]} />;
  }
  return (
    <div className="max-h-[min(70vh,22rem)] space-y-0 overflow-y-auto text-left">
      <p className="mb-2 text-app-xs font-semibold text-muted-foreground">
        {t("overnatting.calendar.reservationsOnDay", { count: rows.length })}
      </p>
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(i > 0 && "mt-3 border-t border-border pt-3")}
        >
          <StayHoverPreview row={row} hideFooter />
        </div>
      ))}
      <p className="mt-3 text-[10px] leading-snug text-muted-foreground md:text-app-xs">
        {t("overnatting.calendar.clickRowToEdit")}
      </p>
    </div>
  );
}

export type AccommodationMonthCalendarProps = {
  reservations: AccommodationReservationRow[];
  monthYm: string;
  onMonthChange: (ym: string) => void;
  canManage: boolean;
  onSelectReservation: (row: AccommodationReservationRow) => void;
  hasUnits: boolean;
};

export function AccommodationMonthCalendar({
  reservations,
  monthYm,
  onMonthChange,
  canManage,
  onSelectReservation,
  hasUnits,
}: AccommodationMonthCalendarProps) {
  const { t, locale } = useTranslation();
  const weekdays = useCalendarWeekdays();

  const ymMatch = /^(\d{4})-(\d{2})$/.exec(monthYm.trim());
  const year = ymMatch ? Number(ymMatch[1]) : new Date().getFullYear();
  const monthIndex = ymMatch ? Number(ymMatch[2]) - 1 : new Date().getMonth();

  const cursor = useMemo(
    () => new Date(year, monthIndex, 1),
    [year, monthIndex],
  );

  const monthName = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "nb" ? "nb-NO" : "en-GB", {
        month: "long",
      }).format(cursor),
    [cursor, locale],
  );

  const ariaMonthYearLabel = useMemo(() => {
    const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${cap} ${year}`;
  }, [monthName, year]);

  const rowsInMonth = useMemo(() => {
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    return reservations.filter((r) =>
      eachStayYmd(r.checkInDate, r.checkOutDate).some((d) => d.startsWith(prefix)),
    );
  }, [reservations, year, monthIndex]);

  const byDay = useMemo(() => {
    const m = new Map<string, AccommodationReservationRow[]>();
    const prefix = `${year}-${pad2(monthIndex + 1)}`;
    const seen = new Map<string, Set<string>>();

    for (const r of rowsInMonth) {
      for (const d of eachStayYmd(r.checkInDate, r.checkOutDate)) {
        if (!d.startsWith(prefix)) continue;
        let ids = seen.get(d);
        if (!ids) {
          ids = new Set();
          seen.set(d, ids);
        }
        if (ids.has(r.id)) continue;
        ids.add(r.id);
        const list = m.get(d) ?? [];
        list.push(r);
        m.set(d, list);
      }
    }
    for (const list of m.values()) {
      list.sort((a, b) => {
        const c = a.customerName.localeCompare(b.customerName, locale);
        if (c !== 0) return c;
        return a.unitName.localeCompare(b.unitName, locale);
      });
    }
    return m;
  }, [rowsInMonth, year, monthIndex, locale]);

  const { daysInMonth, startPad, todayYmd } = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const dim = new Date(year, monthIndex + 1, 0).getDate();
    const start = (first.getDay() + 6) % 7;
    const t = new Date();
    const ty = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    return { daysInMonth: dim, startPad: start, todayYmd: ty };
  }, [year, monthIndex]);

  const emptyMonthMessage =
    rowsInMonth.length === 0
      ? !hasUnits
        ? t("overnatting.calendarEmptyUnits")
        : t("overnatting.calendarEmptyMonth")
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
    const dayRows = byDay.get(ymd) ?? [];
    const isToday = ymd === todayYmd;
    const hasRows = dayRows.length > 0;

    const cellClass = cn(
      "flex min-h-[5.5rem] flex-col gap-1 p-1 sm:min-h-[6.5rem] md:min-h-[7.5rem] md:p-1.5",
      hasRows ? dayCellFillClass(dayRows) : "bg-card",
      isToday &&
        cn("ring-2 ring-inset ring-success", !hasRows && "bg-success/5"),
    );

    const reservationLabel =
      dayRows.length === 1
        ? t("overnatting.calendar.reservationSingular")
        : t("overnatting.calendar.reservationPlural");

    const dayInner = (
      <>
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md text-app-xs font-bold sm:size-7 sm:text-app-sm md:size-8 md:text-app-base",
            isToday
              ? "bg-success !text-white shadow-sm [&_svg]:!text-white"
              : hasRows
                ? "bg-card/80 text-rn-text-heading shadow-sm backdrop-blur-[2px]"
                : "text-rn-text-heading",
          )}
        >
          {day}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-md [-webkit-overflow-scrolling:touch]",
            hasRows && "min-h-[2.25rem] px-0.5 py-0.5",
          )}
        >
          {dayRows.map((b) => (
            <button
              key={`${ymd}-${b.id}`}
              type="button"
              disabled={!canManage}
              className={cn(
                "w-full rounded-md px-1 py-0.5 text-left text-[10px] font-semibold leading-tight transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 sm:text-[11px] md:px-1.5 md:py-1 md:text-app-xs",
                resRowButtonClass(b.status),
                b.status === "cancelled" && "opacity-70",
                !canManage && "cursor-default opacity-90",
              )}
              onClick={() => {
                if (canManage) onSelectReservation(b);
              }}
              aria-label={`${b.customerName}, ${b.unitName}`}
            >
              <span className="line-clamp-2">
                {b.unitName} · {b.customerName}
              </span>
            </button>
          ))}
        </div>
      </>
    );

    dayCells.push(
      hasRows ? (
        <PopoverPrimitive.Root key={ymd} modal={false}>
          <PopoverPrimitive.Trigger
            openOnHover
            delay={180}
            closeDelay={220}
            nativeButton={false}
            aria-label={t("overnatting.calendar.reservationCountAria", {
              count: dayRows.length,
              label: reservationLabel,
              day,
            })}
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
                <DayStaysHoverContent rows={dayRows} />
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="font-heading text-app-xl font-bold capitalize tracking-tight text-rn-text-heading md:text-app-2xl">
            {monthName}
          </h2>
          <span className="font-heading text-app-xl font-bold tabular-nums tracking-tight text-muted-foreground md:text-app-2xl">
            {year}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md border-2 border-rn-border-strong px-4 text-app-sm font-semibold"
            onClick={() => {
              const d = new Date();
              onMonthChange(
                `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
              );
            }}
          >
            {t("calendar.today")}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={() => onMonthChange(ymAdd(monthYm, -12))}
              aria-label={t("calendar.prevYear")}
            >
              <ChevronsLeft className="size-[18px]" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={() => onMonthChange(ymAdd(monthYm, -1))}
              aria-label={t("calendar.prevMonth")}
            >
              <ChevronLeft className="size-[18px]" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={() => onMonthChange(ymAdd(monthYm, 1))}
              aria-label={t("calendar.nextMonth")}
            >
              <ChevronRight className="size-[18px]" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-10 rounded-md border-2 border-rn-border-strong bg-background"
              onClick={() => onMonthChange(ymAdd(monthYm, 12))}
              aria-label={t("calendar.nextYear")}
            >
              <ChevronsRight className="size-[18px]" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="min-w-[280px] overflow-hidden rounded-md border-2 border-rn-border-strong bg-border/80 shadow-sm"
          aria-label={t("overnatting.calendar.monthAria", { month: ariaMonthYearLabel })}
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
